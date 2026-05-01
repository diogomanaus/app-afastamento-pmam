import { useEffect, useState } from 'react';
import { Plus, Trash2, Download, Calendar, Edit2, X, Save } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import type { Militar } from '../types';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';

type TipoPlano = 'ferias' | 'dispensa_honra';
type Divisao = '30' | '15+15' | '10+20';

interface PlanoRow {
  id: number;
  militar_id: number;
  ano: number;
  tipo_plano: TipoPlano;
  divisao: Divisao | null;
  periodo1_inicio: string | null;
  periodo1_fim: string | null;
  periodo2_inicio: string | null;
  periodo2_fim: string | null;
  dias_total: number;
  nome: string;
  posto_graduacao: string;
  matricula?: string;
  observacoes?: string;
}

const TIPO_LABELS: Record<TipoPlano, string> = {
  ferias: 'Férias (30 dias)',
  dispensa_honra: 'Dispensa Honra ao Mérito (8 dias)',
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return format(parseISO(d), 'dd/MM/yyyy');
}

function calcDias(inicio: string, fim: string) {
  if (!inicio || !fim) return 0;
  return differenceInCalendarDays(parseISO(fim), parseISO(inicio)) + 1;
}

export default function PlanoFerias() {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [planos, setPlanos] = useState<PlanoRow[]>([]);
  const [militares, setMilitares] = useState<Militar[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState<PlanoRow | null>(null);

  // Form state
  const [fMilitarId, setFMilitarId] = useState('');
  const [fTipo, setFTipo] = useState<TipoPlano>('ferias');
  const [fDivisao, setFDivisao] = useState<Divisao>('30');
  const [fIni1, setFIni1] = useState('');
  const [fFim1, setFFim1] = useState('');
  const [fIni2, setFIni2] = useState('');
  const [fFim2, setFFim2] = useState('');
  const [fObs, setFObs] = useState('');
  const [saving, setSaving] = useState(false);

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);
  const isSplit = fTipo === 'ferias' && (fDivisao === '15+15' || fDivisao === '10+20');

  const dias1Preview = fIni1 && fFim1 ? calcDias(fIni1, fFim1) : 0;
  const dias2Preview = fIni2 && fFim2 ? calcDias(fIni2, fFim2) : 0;

  useEffect(() => {
    api.get('/militares', { params: { limit: 500 } }).then(r => setMilitares(r.data.data));
  }, []);

  useEffect(() => { carregarPlanos(); }, [ano]);

  async function carregarPlanos() {
    setLoading(true);
    try {
      const r = await api.get('/plano-ferias', { params: { ano } });
      setPlanos(r.data);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFMilitarId(''); setFTipo('ferias'); setFDivisao('30');
    setFIni1(''); setFFim1(''); setFIni2(''); setFFim2(''); setFObs('');
  }

  function abrirFormNovo(militarIdPrefill?: string, tipoPrefill?: TipoPlano) {
    setEditRow(null);
    resetForm();
    if (militarIdPrefill) setFMilitarId(militarIdPrefill);
    if (tipoPrefill) setFTipo(tipoPrefill);
    setShowForm(true);
  }

  function abrirFormEditar(row: PlanoRow) {
    setEditRow(row);
    setFMilitarId(String(row.militar_id));
    setFTipo(row.tipo_plano);
    setFDivisao(row.divisao || '30');
    setFIni1(row.periodo1_inicio || '');
    setFFim1(row.periodo1_fim || '');
    setFIni2(row.periodo2_inicio || '');
    setFFim2(row.periodo2_fim || '');
    setFObs(row.observacoes ?? '');
    setShowForm(true);
  }

  async function salvar() {
    if (!fMilitarId || !fIni1 || !fFim1) return toast.error('Selecione o militar e o período');
    if (isSplit && (!fIni2 || !fFim2)) return toast.error('Informe o 2º período');
    setSaving(true);
    try {
      const payload: any = {
        tipo_plano: fTipo,
        divisao: fTipo === 'ferias' ? fDivisao : null,
        periodo1_inicio: fIni1,
        periodo1_fim: fFim1,
        periodo2_inicio: isSplit ? fIni2 : null,
        periodo2_fim: isSplit ? fFim2 : null,
        observacoes: fObs,
      };
      if (editRow) {
        await api.put(`/plano-ferias/${editRow.id}`, payload);
        toast.success('Plano atualizado!');
      } else {
        await api.post('/plano-ferias', { militar_id: parseInt(fMilitarId), ano, ...payload });
        toast.success('Plano incluído!');
      }
      setShowForm(false);
      carregarPlanos();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function excluir(row: PlanoRow) {
    if (!confirm(`Remover previsão de ${row.nome}?`)) return;
    try {
      await api.delete(`/plano-ferias/${row.id}`);
      toast.success('Removido');
      setPlanos(prev => prev.filter(p => p.id !== row.id));
    } catch { toast.error('Erro ao remover'); }
  }

  function exportarCSV() {
    const header = 'Nome;Posto;Matrícula;Ano;Tipo;Divisão;Início 1;Fim 1;Início 2;Fim 2;Dias\n';
    const rows = planos.map(p =>
      `${p.nome};${p.posto_graduacao};${p.matricula ?? ''};${p.ano};${TIPO_LABELS[p.tipo_plano]};${p.divisao ?? ''};${fmtDate(p.periodo1_inicio)};${fmtDate(p.periodo1_fim)};${fmtDate(p.periodo2_inicio)};${fmtDate(p.periodo2_fim)};${p.dias_total}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `plano_ferias_${ano}.csv`;
    a.click();
  }

  const ferias = planos.filter(p => p.tipo_plano === 'ferias');
  const dispensas = planos.filter(p => p.tipo_plano === 'dispensa_honra');
  const idsComFerias = new Set(ferias.map(p => p.militar_id));
  const semFerias = militares.filter(m => !idsComFerias.has(m.id));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card py-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end justify-between">
          <div className="flex items-center gap-3">
            <div>
              <label className="label">Ano</label>
              <select className="input w-32" value={ano} onChange={e => setAno(parseInt(e.target.value))}>
                {anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="pt-5 text-sm text-gray-500">
              <span className="font-bold text-pmam-blue">{ferias.length}</span> férias ·{' '}
              <span className="font-bold text-amber-600">{dispensas.length}</span> dispensas ·{' '}
              <span className="font-bold text-orange-500">{semFerias.length}</span> sem previsão
            </div>
          </div>
          <div className="flex gap-2">
            {planos.length > 0 && (
              <button onClick={exportarCSV} className="btn-secondary flex items-center gap-1.5 text-sm">
                <Download size={15} /> CSV
              </button>
            )}
            <button onClick={() => abrirFormNovo()} className="btn-primary flex items-center gap-1.5 text-sm">
              <Plus size={15} /> Incluir Previsão
            </button>
          </div>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="card border-2 border-pmam-gold/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-pmam-blue text-sm uppercase tracking-wide">
              {editRow ? 'Editar Previsão' : 'Nova Previsão'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Militar */}
            <div className="sm:col-span-2">
              <label className="label">Militar *</label>
              <select className="input" value={fMilitarId} onChange={e => setFMilitarId(e.target.value)} disabled={!!editRow}>
                <option value="">Selecione...</option>
                {militares.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.posto_graduacao} {m.nome}{m.matricula ? ` — Mat. ${m.matricula}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo */}
            <div>
              <label className="label">Tipo *</label>
              <select className="input" value={fTipo} onChange={e => { setFTipo(e.target.value as TipoPlano); setFDivisao('30'); setFIni2(''); setFFim2(''); }}>
                <option value="ferias">Férias (30 dias)</option>
                <option value="dispensa_honra">Dispensa Honra ao Mérito (8 dias)</option>
              </select>
            </div>

            {/* Divisão (férias apenas) */}
            {fTipo === 'ferias' && (
              <div>
                <label className="label">Divisão *</label>
                <select className="input" value={fDivisao} onChange={e => { setFDivisao(e.target.value as Divisao); setFIni2(''); setFFim2(''); }}>
                  <option value="30">30 dias (período único)</option>
                  <option value="15+15">15 + 15 dias</option>
                  <option value="10+20">10 + 20 dias</option>
                </select>
              </div>
            )}

            {/* 1º Período */}
            <div className="sm:col-span-2">
              <p className="text-xs font-bold text-pmam-blue uppercase tracking-wide mb-2">
                {isSplit
                  ? `1º Período (${fDivisao === '15+15' ? '15 dias' : '10 dias'})`
                  : fTipo === 'dispensa_honra' ? 'Período (8 dias)' : '1º Período (30 dias)'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Data de Início *</label>
                  <input type="date" className="input" value={fIni1}
                    onChange={e => { setFIni1(e.target.value); if (fFim1 && e.target.value > fFim1) setFFim1(''); }} />
                </div>
                <div>
                  <label className="label">Data de Fim *</label>
                  <input type="date" className="input" value={fFim1} min={fIni1}
                    onChange={e => setFFim1(e.target.value)} />
                </div>
              </div>
              {dias1Preview > 0 && (
                <p className="text-xs text-pmam-blue mt-1 font-semibold">{dias1Preview} dias</p>
              )}
            </div>

            {/* 2º Período (apenas quando dividido) */}
            {isSplit && (
              <div className="sm:col-span-2">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">
                  2º Período ({fDivisao === '15+15' ? '15 dias' : '20 dias'})
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Data de Início *</label>
                    <input type="date" className="input" value={fIni2}
                      onChange={e => { setFIni2(e.target.value); if (fFim2 && e.target.value > fFim2) setFFim2(''); }} />
                  </div>
                  <div>
                    <label className="label">Data de Fim *</label>
                    <input type="date" className="input" value={fFim2} min={fIni2}
                      onChange={e => setFFim2(e.target.value)} />
                  </div>
                </div>
                {dias2Preview > 0 && (
                  <p className="text-xs text-amber-600 mt-1 font-semibold">{dias2Preview} dias</p>
                )}
              </div>
            )}

            {/* Total preview */}
            {(dias1Preview + dias2Preview) > 0 && (
              <div className="sm:col-span-2 bg-pmam-gold/10 border border-pmam-gold/30 rounded-lg px-4 py-2 text-center">
                <span className="text-pmam-blue font-bold">
                  Total: {dias1Preview + dias2Preview} dias
                </span>
              </div>
            )}

            {/* Observações */}
            <div className="sm:col-span-2">
              <label className="label">Observações</label>
              <input className="input" value={fObs} onChange={e => setFObs(e.target.value)} placeholder="Observações opcionais..." />
            </div>
          </div>

          <div className="flex gap-3 mt-4 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={salvar} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
              <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-pmam-gold border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* Tabela Férias */}
          <div className="card p-0 overflow-hidden">
            <div className="bg-pmam-blue px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Calendar size={16} /> Férias Regulamentares — {ano}
              </h3>
              <span className="text-pmam-gold text-xs font-semibold">{ferias.length} militar(es)</span>
            </div>
            {ferias.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                <p>Nenhuma férias planejada para {ano}</p>
                <button onClick={() => abrirFormNovo()} className="btn-primary mt-3 inline-flex items-center gap-2 text-sm">
                  <Plus size={14} /> Incluir previsão
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Militar</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Posto</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">Divisão</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">1º Período</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">2º Período</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">Dias</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ferias.map((p, i) => (
                      <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 ? 'bg-gray-50/40' : ''}`}>
                        <td className="px-4 py-3 font-medium text-gray-800">{p.nome}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{p.posto_graduacao}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-pmam-blue/10 text-pmam-blue text-xs font-bold px-2 py-1 rounded-full">
                            {p.divisao ?? '30'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                          {p.periodo1_inicio && p.periodo1_fim
                            ? <span className="bg-pmam-gold text-white px-2 py-1 rounded-full font-semibold">
                                {fmtDate(p.periodo1_inicio)} – {fmtDate(p.periodo1_fim)}
                              </span>
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                          {p.periodo2_inicio && p.periodo2_fim
                            ? <span className="bg-amber-500 text-white px-2 py-1 rounded-full font-semibold">
                                {fmtDate(p.periodo2_inicio)} – {fmtDate(p.periodo2_fim)}
                              </span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-pmam-blue">{p.dias_total}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => abrirFormEditar(p)}
                              className="p-1.5 text-pmam-blue hover:bg-blue-50 rounded-lg" title="Editar">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => excluir(p)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Remover">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tabela Dispensa */}
          <div className="card p-0 overflow-hidden">
            <div className="bg-amber-600 px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Calendar size={16} /> Dispensa por Honra ao Mérito (8 dias) — {ano}
              </h3>
              <span className="text-amber-100 text-xs font-semibold">{dispensas.length} militar(es)</span>
            </div>
            {dispensas.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                <p>Nenhuma dispensa planejada para {ano}</p>
                <button onClick={() => abrirFormNovo(undefined, 'dispensa_honra')}
                  className="btn-secondary mt-3 inline-flex items-center gap-2 text-sm">
                  <Plus size={14} /> Incluir dispensa
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Militar</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Posto</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">Período (8 dias)</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispensas.map((p, i) => (
                      <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 ? 'bg-gray-50/40' : ''}`}>
                        <td className="px-4 py-3 font-medium text-gray-800">{p.nome}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{p.posto_graduacao}</td>
                        <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                          {p.periodo1_inicio && p.periodo1_fim
                            ? <span className="bg-amber-500 text-white px-2 py-1 rounded-full font-semibold">
                                {fmtDate(p.periodo1_inicio)} – {fmtDate(p.periodo1_fim)}
                              </span>
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => abrirFormEditar(p)}
                              className="p-1.5 text-pmam-blue hover:bg-blue-50 rounded-lg" title="Editar">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => excluir(p)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Remover">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Militares sem previsão */}
          {semFerias.length > 0 && (
            <div className="card border border-orange-200 bg-orange-50">
              <h3 className="text-sm font-bold text-orange-700 mb-3 flex items-center gap-2">
                <Calendar size={16} /> Militares sem previsão de férias em {ano} ({semFerias.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {semFerias.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-100">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{m.nome}</p>
                      <p className="text-xs text-gray-400">{m.posto_graduacao}</p>
                    </div>
                    <button onClick={() => abrirFormNovo(String(m.id))}
                      className="text-pmam-blue text-xs hover:underline flex items-center gap-1">
                      <Plus size={12} /> Incluir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
