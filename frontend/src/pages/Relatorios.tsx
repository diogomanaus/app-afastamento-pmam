import { useEffect, useState, useRef, useMemo } from 'react';
import {
  Download, Search, Map, Calendar, Clock, AlertTriangle,
  CheckCircle, Users, FileText, X, TrendingUp, BarChart3,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import type { Militar, TipoAfastamento } from '../types';
import { format, parseISO } from 'date-fns';

// ── Constantes ───────────────────────────────────────────────────────────────
const MESES     = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL= ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const COLORS    = ['#1B3060','#C8960C','#2D5FA3','#10B981','#EF4444','#6B7280','#F59E0B','#8B5CF6'];

type Tab = 'mapa' | 'realizados' | 'futuros' | 'nao_gozadas' | 'detalhado';
type DetView = 'tipo' | 'periodo' | 'efetivo';

function fmtDt(d: string) {
  if (!d) return '—';
  return format(parseISO(d.split('T')[0]), 'dd/MM/yyyy');
}

// ── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, border }: any) {
  return (
    <div className={`card border-l-4 ${border} flex items-center gap-4 py-4`}>
      <div className={`p-3 rounded-xl ${color} flex-shrink-0`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500 truncate">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ── MiniBarChart ─────────────────────────────────────────────────────────────
function MiniBarChart({ data, dataKey, nameKey, color = '#1B3060', height = 120 }: any) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} name="Total" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── MiniPieChart ─────────────────────────────────────────────────────────────
function MiniPieChart({ data, height = 150 }: any) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="45%" outerRadius={55} dataKey="value" paddingAngle={2}>
          {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── FeriasSituacao ────────────────────────────────────────────────────────────
function FeriasSituacao({ ano }: { ano: string }) {
  const [data, setData] = useState<{ comFerias: any[]; semFerias: any[] } | null>(null);

  useEffect(() => {
    api.get('/relatorios/ferias-situacao', { params: { ano } })
      .then(r => setData(r.data))
      .catch(() => setData({ comFerias: [], semFerias: [] }));
  }, [ano]);

  if (!data) return <div className="card text-center py-6 text-gray-400 text-sm">Carregando situação de férias...</div>;

  const situacaoBadge = (s: string) => {
    if (s === 'em_gozo')   return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Em gozo</span>;
    if (s === 'gozadas')   return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Gozadas</span>;
    return                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Previstas</span>;
  };

  return (
    <>
      {/* PMs com férias */}
      <div className="card">
        <p className="font-bold text-pmam-blue text-sm mb-3 uppercase tracking-wide">
          ✅ PMs com Férias Gozadas / Em Gozo ({data.comFerias.length})
        </p>
        {data.comFerias.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum registro encontrado para {ano}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-semibold">Militar</th>
                  <th className="pb-2 font-semibold">Posto</th>
                  <th className="pb-2 font-semibold">Período 1</th>
                  <th className="pb-2 font-semibold">Período 2</th>
                  <th className="pb-2 font-semibold">Situação</th>
                </tr>
              </thead>
              <tbody>
                {data.comFerias.map((m: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-800">{m.nome}</td>
                    <td className="py-2 text-gray-500">{m.posto_graduacao}</td>
                    <td className="py-2 text-gray-600">
                      {m.periodo1_inicio ? `${fmtDt(m.periodo1_inicio)} a ${fmtDt(m.periodo1_fim)}` : '—'}
                    </td>
                    <td className="py-2 text-gray-600">
                      {m.periodo2_inicio ? `${fmtDt(m.periodo2_inicio)} a ${fmtDt(m.periodo2_fim)}` : '—'}
                    </td>
                    <td className="py-2">{situacaoBadge(m.situacao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PMs sem férias */}
      <div className="card border border-red-100">
        <p className="font-bold text-red-600 text-sm mb-3 uppercase tracking-wide">
          ⚠ PMs que Não Usufruíram de Férias ({data.semFerias.length})
        </p>
        {data.semFerias.length === 0 ? (
          <p className="text-gray-400 text-sm">Todos os militares têm férias planejadas para {ano} 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-semibold">Militar</th>
                  <th className="pb-2 font-semibold">Posto / Graduação</th>
                  <th className="pb-2 font-semibold">Matrícula</th>
                </tr>
              </thead>
              <tbody>
                {data.semFerias.map((m: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-800">{m.nome}</td>
                    <td className="py-2 text-gray-500">{m.posto_graduacao}</td>
                    <td className="py-2 text-gray-500">{m.matricula ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Exportar CSV ──────────────────────────────────────────────────────────────
function exportCSV(dados: any[], nome: string, ano: string) {
  const h = ['ID','Militar','Posto','Matrícula','Tipo','Início','Fim','Dias','Status'];
  const rows = dados.map((a: any) => [
    a.id, a.militar_nome, a.posto_graduacao, a.matricula ?? '',
    a.tipo_nome, fmtDt(a.data_inicio), fmtDt(a.data_fim), a.dias_total, a.status,
  ].join(';'));
  const blob = new Blob([h.join(';')+'\n'+rows.join('\n')], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const el = document.createElement('a');
  el.href = url; el.download = `${nome}_${ano}.csv`; el.click();
  URL.revokeObjectURL(url);
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Relatorios() {
  const [tab, setTab]   = useState<Tab>('mapa');
  const [ano, setAno]   = useState(String(new Date().getFullYear()));
  const [tipos, setTipos] = useState<TipoAfastamento[]>([]);
  const [militares, setMilitares] = useState<Militar[]>([]);
  const anos = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + 1 - i);

  // ── Filtro compartilhado de militar ───────────────────────────────────────
  const [militarId,   setMilitarId]   = useState('');
  const [militarBusca,setMilitarBusca] = useState('');
  const [militarNome, setMilitarNome]  = useState('');
  const [showDrop,    setShowDrop]     = useState(false);
  const buscaRef = useRef<HTMLDivElement>(null);

  const militaresFilt = militarBusca.trim()
    ? militares.filter(m =>
        m.nome.toLowerCase().includes(militarBusca.toLowerCase()) ||
        (m.matricula ?? '').toLowerCase().includes(militarBusca.toLowerCase())
      ).slice(0, 8)
    : [];

  function selecionarMilitar(m: Militar) {
    setMilitarId(String(m.id)); setMilitarNome(m.nome);
    setMilitarBusca(m.nome);   setShowDrop(false);
  }
  function limparMilitar() {
    setMilitarId(''); setMilitarNome(''); setMilitarBusca(''); setShowDrop(false);
  }

  // ── Mapa Geral ────────────────────────────────────────────────────────────
  const [mapa, setMapa]         = useState<any>(null);
  const [mapaLoad, setMapaLoad] = useState(false);

  // ── Realizados ────────────────────────────────────────────────────────────
  const [realizados, setRealizados]     = useState<any[]>([]);
  const [realLoad,   setRealLoad]       = useState(false);
  const [realStatus, setRealStatus]     = useState('');
  const [realTipo,   setRealTipo]       = useState('');
  const [realMes,    setRealMes]        = useState('');

  // ── Futuros ───────────────────────────────────────────────────────────────
  const [futuros,    setFuturos]    = useState<any[]>([]);
  const [futLoad,    setFutLoad]    = useState(false);
  const [diasFut,    setDiasFut]    = useState('90');

  // ── Não Gozadas ───────────────────────────────────────────────────────────
  const [naoGoz,    setNaoGoz]    = useState<any[]>([]);
  const [naoGozLoad,setNaoGozLoad]= useState(false);

  // ── Detalhado ─────────────────────────────────────────────────────────────
  const [detalhado,  setDetalhado]  = useState<any[]>([]);
  const [detLoad,    setDetLoad]    = useState(false);
  const [detMes,     setDetMes]     = useState('');
  const [detTipo,    setDetTipo]    = useState('');
  const [detStatus,  setDetStatus]  = useState('');
  const [detView,    setDetView]    = useState<DetView>('tipo');
  const [efeitoAberto, setEfeitoAberto] = useState<string|null>(null);

  // ── Inicialização ─────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get('/afastamentos/tipos'),
      api.get('/militares', { params: { limit: 500 } }),
    ]).then(([t, m]) => {
      setTipos(t.data);
      setMilitares(m.data.data ?? []);
    });
  }, []);

  // ── Auto-carregamento por aba ─────────────────────────────────────────────
  useEffect(() => { if (tab === 'mapa')        carregarMapa();       }, [tab, ano, militarId]);
  useEffect(() => { if (tab === 'realizados')  carregarRealizados(); }, [tab, ano, militarId, realStatus, realTipo, realMes]);
  useEffect(() => { if (tab === 'futuros')     carregarFuturos();    }, [tab, diasFut, militarId]);
  useEffect(() => { if (tab === 'nao_gozadas') carregarNaoGoz();     }, [tab, ano, militarId]);
  useEffect(() => { if (tab === 'detalhado')   carregarDetalhado();  }, [tab, ano, militarId, detMes, detTipo, detStatus]);

  // ── Funções de carga ──────────────────────────────────────────────────────
  async function carregarMapa() {
    setMapaLoad(true);
    try { const r = await api.get('/relatorios/mapa-geral', { params: { ano, militar_id: militarId||undefined } }); setMapa(r.data); }
    catch { setMapa(null); } finally { setMapaLoad(false); }
  }
  async function carregarRealizados() {
    setRealLoad(true);
    try {
      const r = await api.get('/relatorios/afastamentos-detalhado', { params: {
        ano, militar_id: militarId||undefined,
        mes: realMes||undefined, tipo_id: realTipo||undefined, status: realStatus||undefined,
      }});
      setRealizados(r.data);
    } catch { setRealizados([]); } finally { setRealLoad(false); }
  }
  async function carregarFuturos() {
    setFutLoad(true);
    try { const r = await api.get('/relatorios/futuros', { params: { dias: diasFut, militar_id: militarId||undefined } }); setFuturos(r.data); }
    catch { setFuturos([]); } finally { setFutLoad(false); }
  }
  async function carregarNaoGoz() {
    setNaoGozLoad(true);
    try { const r = await api.get('/relatorios/ferias-nao-gozadas', { params: { ano, militar_id: militarId||undefined } }); setNaoGoz(r.data); }
    catch { setNaoGoz([]); } finally { setNaoGozLoad(false); }
  }
  async function carregarDetalhado() {
    setDetLoad(true);
    try {
      const r = await api.get('/relatorios/afastamentos-detalhado', { params: {
        ano, militar_id: militarId||undefined,
        mes: detMes||undefined, tipo_id: detTipo||undefined, status: detStatus||undefined,
      }});
      setDetalhado(r.data);
    } catch { setDetalhado([]); } finally { setDetLoad(false); }
  }

  // ── Dados derivados para gráficos ─────────────────────────────────────────
  const mensalMapaChart = MESES.slice(1).map((m, i) => {
    const d = mapa?.porMes?.find((r: any) => parseInt(r.mes) === i+1);
    return { mes: m, total: d ? parseInt(d.total) : 0 };
  });

  const realPorMes = useMemo(() => {
    const acc: Record<string, number> = {};
    realizados.forEach((a: any) => {
      const m = new Date(a.data_inicio.split('T')[0]+'T12:00:00').getMonth()+1;
      acc[String(m).padStart(2,'0')] = (acc[String(m).padStart(2,'0')]||0)+1;
    });
    return Object.entries(acc).sort(([a],[b])=>parseInt(a)-parseInt(b))
      .map(([m, v]) => ({ mes: MESES[parseInt(m)], total: v }));
  }, [realizados]);

  const futPorMes = useMemo(() => {
    const acc: Record<string, number> = {};
    futuros.forEach((a: any) => {
      const m = new Date(a.data_inicio.split('T')[0]+'T12:00:00').getMonth()+1;
      acc[String(m).padStart(2,'0')] = (acc[String(m).padStart(2,'0')]||0)+1;
    });
    return Object.entries(acc).sort(([a],[b])=>parseInt(a)-parseInt(b))
      .map(([m, v]) => ({ mes: MESES[parseInt(m)], total: v }));
  }, [futuros]);

  // Detalhado — sub-relatórios derivados
  const detPorTipo = useMemo(() => {
    const acc: Record<string, { total: number; dias: number }> = {};
    detalhado.forEach((a: any) => {
      if (!acc[a.tipo_nome]) acc[a.tipo_nome] = { total: 0, dias: 0 };
      acc[a.tipo_nome].total++;
      acc[a.tipo_nome].dias += a.dias_total;
    });
    return Object.entries(acc)
      .map(([tipo, v]) => ({ tipo, total: v.total, dias: v.dias,
        pct: detalhado.length ? ((v.total/detalhado.length)*100).toFixed(1) : '0' }))
      .sort((a,b)=>b.total-a.total);
  }, [detalhado]);

  const detPorPeriodo = useMemo(() => {
    const acc: Record<string, { total: number; dias: number }> = {};
    detalhado.forEach((a: any) => {
      const m = new Date(a.data_inicio.split('T')[0]+'T12:00:00').getMonth()+1;
      const key = String(m).padStart(2,'0');
      if (!acc[key]) acc[key] = { total: 0, dias: 0 };
      acc[key].total++;
      acc[key].dias += a.dias_total;
    });
    return Object.entries(acc).sort(([a],[b])=>parseInt(a)-parseInt(b))
      .map(([m, v]) => ({ mes: MESES_FULL[parseInt(m)], mesNum: parseInt(m), total: v.total, dias: v.dias }));
  }, [detalhado]);

  const detPorEfetivo = useMemo(() => {
    const acc: Record<string, { nome: string; posto: string; matricula: string; registros: any[] }> = {};
    detalhado.forEach((a: any) => {
      if (!acc[a.militar_nome]) acc[a.militar_nome] = { nome: a.militar_nome, posto: a.posto_graduacao, matricula: a.matricula??'', registros: [] };
      acc[a.militar_nome].registros.push(a);
    });
    return Object.values(acc)
      .map(v => ({ ...v, total: v.registros.length, dias: v.registros.reduce((s, a) => s+a.dias_total, 0) }))
      .sort((a,b)=>b.dias-a.dias);
  }, [detalhado]);

  // Spinner
  function Spinner() {
    return <div className="flex justify-center py-16"><div className="w-9 h-9 border-4 border-pmam-gold border-t-transparent rounded-full animate-spin"/></div>;
  }

  const TABS = [
    { id:'mapa',        label:'Mapa Geral',         icon: Map },
    { id:'realizados',  label:'Realizados',          icon: CheckCircle },
    { id:'futuros',     label:'Futuros',             icon: Calendar },
    { id:'nao_gozadas', label:'Férias Não Gozadas',  icon: AlertTriangle },
    { id:'detalhado',   label:'Detalhado',           icon: FileText },
  ];

  // ╔═══════════════════════════════════════════════════════════════════════╗
  return (
    <div className="space-y-4">

      {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
      <div className="bg-pmam-blue text-white rounded-xl px-5 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-pmam-gold font-semibold uppercase tracking-wide">Relatórios — DINATIV</p>
          <p className="font-bold">Central de Análise de Afastamentos</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-pmam-gold font-semibold">Ano</label>
          <select className="bg-white/10 border border-white/30 text-white rounded-lg px-3 py-1.5 text-sm"
            value={ano} onChange={e => setAno(e.target.value)}>
            {anos.map(a => <option key={a} value={a} className="text-gray-800">{a}</option>)}
          </select>
        </div>
      </div>

      {/* ── Filtro por militar ─────────────────────────────────────────── */}
      <div className="card py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Users size={15} className="text-pmam-blue" />
          <span className="text-sm font-semibold text-pmam-blue">Militar:</span>
        </div>
        <div className="relative flex-1 min-w-[220px] max-w-sm" ref={buscaRef}>
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8 pr-8 py-1.5 text-sm"
            placeholder="Buscar por nome ou matrícula..."
            value={militarBusca}
            onChange={e => { setMilitarBusca(e.target.value); setMilitarId(''); setMilitarNome(''); setShowDrop(true); }}
            onFocus={() => setShowDrop(true)}
            onBlur={() => setTimeout(() => setShowDrop(false), 150)}
          />
          {militarBusca && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400" onClick={limparMilitar}>
              <X size={13}/>
            </button>
          )}
          {showDrop && militaresFilt.length > 0 && !militarId && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
              {militaresFilt.map(m => (
                <button key={m.id} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  onMouseDown={() => selecionarMilitar(m)}>
                  <span className="font-semibold text-gray-800">{m.nome}</span>
                  <span className="text-gray-400 ml-1">— {m.posto_graduacao}</span>
                  {m.matricula && <span className="text-gray-300 ml-1">· {m.matricula}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        {militarId ? (
          <span className="flex items-center gap-1.5 bg-pmam-blue text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
            <CheckCircle size={12}/> {militarNome}
            <button onClick={limparMilitar} className="ml-1 opacity-70 hover:opacity-100"><X size={11}/></button>
          </span>
        ) : (
          <span className="text-gray-400 text-xs italic">Todos os militares</span>
        )}
      </div>

      {/* ── Abas ───────────────────────────────────────────────────────── */}
      <div className="flex overflow-x-auto gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center
              ${tab===id ? 'bg-white text-pmam-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      {/* ╔═══════════════════════════════════════════════════════════════╗ */}
      {/* ║  ABA: MAPA GERAL                                             ║ */}
      {/* ╚═══════════════════════════════════════════════════════════════╝ */}
      {tab==='mapa' && (
        <div className="space-y-4">
          {mapaLoad ? <Spinner/> : mapa ? (<>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <StatCard icon={BarChart3} label="Afastamentos no Ano" value={mapa.totais.total_afastamentos??0}
                sub={`${mapa.totais.total_dias??0} dias no total`} color="bg-blue-50 text-pmam-blue" border="border-l-pmam-blue"/>
              <StatCard icon={CheckCircle} label="Concluídos" value={mapa.totais.concluidos??0}
                sub={`Média ${mapa.totais.media_dias??0} dias`} color="bg-green-50 text-green-600" border="border-l-green-400"/>
              <StatCard icon={Clock} label="Em Andamento / Pendentes"
                value={`${mapa.totais.em_andamento??0} / ${mapa.totais.pendentes??0}`}
                color="bg-yellow-50 text-yellow-700" border="border-l-yellow-400"/>
              <StatCard icon={Calendar} label="Futuros (próx. 30d)" value={mapa.proximosMes??0}
                color="bg-pmam-gold/10 text-pmam-gold" border="border-l-pmam-gold"/>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="card text-center border border-gray-100">
                <p className="text-3xl font-bold text-pmam-blue">{mapa.militaresAtivos}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1"><Users size={12}/>Militares Ativos</p>
              </div>
              <div className="card text-center border border-green-200 bg-green-50">
                <p className="text-3xl font-bold text-green-600">{mapa.militaresComFerias}</p>
                <p className="text-xs text-green-700 mt-1 flex items-center justify-center gap-1"><CheckCircle size={12}/>Férias gozadas em {ano}</p>
              </div>
              <div className="card text-center border border-red-200 bg-red-50">
                <p className="text-3xl font-bold text-red-500">{mapa.militaresSemFerias}</p>
                <p className="text-xs text-red-600 mt-1 flex items-center justify-center gap-1"><AlertTriangle size={12}/>Sem férias em {ano}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="card xl:col-span-2">
                <p className="font-bold text-pmam-blue text-sm mb-3 uppercase tracking-wide">Afastamentos por Mês — {ano}</p>
                <MiniBarChart data={mensalMapaChart} dataKey="total" nameKey="mes" height={180}/>
              </div>
              <div className="card">
                <p className="font-bold text-pmam-blue text-sm mb-2 uppercase tracking-wide">Por Tipo</p>
                <MiniPieChart data={mapa.porTipo?.slice(0,6).map((t: any)=>({ name: t.tipo.slice(0,20), value: parseInt(t.total) }))} height={180}/>
              </div>
            </div>
            <div className="card">
              <p className="font-bold text-pmam-blue text-sm mb-3 uppercase tracking-wide">Distribuição por Tipo</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-2 px-2 font-semibold">Tipo</th>
                    <th className="pb-2 px-2 font-semibold text-center">Qtd</th>
                    <th className="pb-2 px-2 font-semibold text-center">Dias</th>
                    <th className="pb-2 px-2 font-semibold text-center">%</th>
                    <th className="pb-2 px-2 font-semibold">Proporção</th>
                  </tr></thead>
                  <tbody>
                    {mapa.porTipo?.map((t: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium">{t.tipo}</td>
                        <td className="py-2 px-2 text-center font-bold text-pmam-blue">{t.total}</td>
                        <td className="py-2 px-2 text-center text-gray-500">{t.total_dias}d</td>
                        <td className="py-2 px-2 text-center text-gray-400">{t.percentual}%</td>
                        <td className="py-2 px-2 w-28">
                          <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className="h-full rounded-full bg-pmam-blue" style={{ width:`${Math.min(100,parseFloat(t.percentual))}%` }}/>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <FeriasSituacao ano={ano} />
          </>) : (
            <div className="card text-center py-14 text-gray-400">
              <Map size={36} className="mx-auto mb-3 text-gray-200"/>
              <button onClick={carregarMapa} className="btn-primary text-sm mt-2">Tentar novamente</button>
            </div>
          )}
        </div>
      )}

      {/* ╔═══════════════════════════════════════════════════════════════╗ */}
      {/* ║  ABA: REALIZADOS                                             ║ */}
      {/* ╚═══════════════════════════════════════════════════════════════╝ */}
      {tab==='realizados' && (
        <div className="space-y-4">
          {/* Cards de resumo */}
          {!realLoad && realizados.length > 0 && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <StatCard icon={BarChart3} label="Total Afastamentos" value={realizados.length}
                color="bg-blue-50 text-pmam-blue" border="border-l-pmam-blue"/>
              <StatCard icon={TrendingUp} label="Total de Dias" value={realizados.reduce((s,a)=>s+a.dias_total,0)}
                color="bg-pmam-gold/10 text-pmam-gold" border="border-l-pmam-gold"/>
              <StatCard icon={Clock} label="Média por Afastamento"
                value={`${(realizados.reduce((s,a)=>s+a.dias_total,0)/realizados.length).toFixed(1)}d`}
                color="bg-yellow-50 text-yellow-700" border="border-l-yellow-400"/>
              <StatCard icon={CheckCircle} label="Concluídos"
                value={realizados.filter((a:any)=>a.status==='concluido').length}
                sub={`${((realizados.filter((a:any)=>a.status==='concluido').length/realizados.length)*100).toFixed(0)}% do total`}
                color="bg-green-50 text-green-600" border="border-l-green-400"/>
            </div>
          )}

          {/* Filtros */}
          <div className="card">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Status</label>
                <select className="input" value={realStatus} onChange={e=>setRealStatus(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="concluido">Concluído</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="pendente">Pendente</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="reprovado">Reprovado</option>
                </select>
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={realTipo} onChange={e=>setRealTipo(e.target.value)}>
                  <option value="">Todos os tipos</option>
                  {tipos.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Mês</label>
                <select className="input" value={realMes} onChange={e=>setRealMes(e.target.value)}>
                  <option value="">Todos os meses</option>
                  {MESES_FULL.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {realLoad ? <Spinner/> : (
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-pmam-blue text-sm uppercase tracking-wide">
                  {realizados.length} registro(s) — {ano}
                </h3>
                {realizados.length > 0 && (
                  <button onClick={()=>exportCSV(realizados,'realizados',ano)} className="btn-secondary flex items-center gap-1.5 text-sm">
                    <Download size={14}/> CSV
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 px-2 font-semibold">Militar</th>
                    <th className="pb-2 px-2 font-semibold">Tipo</th>
                    <th className="pb-2 px-2 font-semibold">Início</th>
                    <th className="pb-2 px-2 font-semibold">Fim</th>
                    <th className="pb-2 px-2 font-semibold text-center">Dias</th>
                    <th className="pb-2 px-2 font-semibold">Status</th>
                  </tr></thead>
                  <tbody>
                    {realizados.length===0 ? (
                      <tr><td colSpan={6} className="py-10 text-center text-gray-400">Nenhum resultado</td></tr>
                    ) : realizados.map((a:any)=>(
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 px-2">
                          <p className="font-semibold text-gray-800">{a.militar_nome}</p>
                          <p className="text-gray-400">{a.posto_graduacao}</p>
                        </td>
                        <td className="py-2 px-2 text-gray-600 max-w-[150px] truncate">{a.tipo_nome}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{fmtDt(a.data_inicio)}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{fmtDt(a.data_fim)}</td>
                        <td className="py-2 px-2 text-center font-bold text-pmam-blue">{a.dias_total}</td>
                        <td className="py-2 px-2"><StatusBadge status={a.status}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mini gráfico por mês */}
              {realPorMes.length > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Distribuição por Mês</p>
                  <MiniBarChart data={realPorMes} dataKey="total" nameKey="mes" color="#C8960C" height={100}/>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ╔═══════════════════════════════════════════════════════════════╗ */}
      {/* ║  ABA: FUTUROS                                                ║ */}
      {/* ╚═══════════════════════════════════════════════════════════════╝ */}
      {tab==='futuros' && (
        <div className="space-y-4">
          {!futLoad && futuros.length > 0 && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <StatCard icon={Calendar} label="Total Programado" value={futuros.length}
                color="bg-blue-50 text-pmam-blue" border="border-l-pmam-blue"/>
              <StatCard icon={Clock} label="Próximos 7 dias"
                value={futuros.filter((a:any)=>parseInt(a.dias_para_inicio)<=7).length}
                color="bg-red-50 text-red-500" border="border-l-red-400"/>
              <StatCard icon={TrendingUp} label="Próximos 30 dias"
                value={futuros.filter((a:any)=>parseInt(a.dias_para_inicio)<=30).length}
                color="bg-yellow-50 text-yellow-700" border="border-l-yellow-400"/>
              <StatCard icon={CheckCircle} label="Aprovados"
                value={futuros.filter((a:any)=>a.status==='aprovado').length}
                color="bg-green-50 text-green-600" border="border-l-green-400"/>
            </div>
          )}

          <div className="card flex items-center gap-3 py-3">
            <Calendar size={15} className="text-pmam-blue"/>
            <span className="text-sm font-semibold text-pmam-blue">Horizonte:</span>
            <select className="input w-36 py-1.5 text-sm" value={diasFut} onChange={e=>setDiasFut(e.target.value)}>
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
              <option value="180">180 dias</option>
            </select>
            <button onClick={carregarFuturos} className="btn-primary text-sm flex items-center gap-1"><Search size={13}/>Atualizar</button>
          </div>

          {futLoad ? <Spinner/> : (
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-pmam-blue text-sm uppercase tracking-wide">
                  {futuros.length} afastamento(s) nos próximos {diasFut} dias
                </h3>
                {futuros.length > 0 && (
                  <button onClick={()=>exportCSV(futuros,'futuros',ano)} className="btn-secondary flex items-center gap-1.5 text-sm">
                    <Download size={14}/> CSV
                  </button>
                )}
              </div>

              {futuros.length===0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  <Calendar size={32} className="mx-auto mb-2 text-gray-200"/>
                  Nenhum afastamento nos próximos {diasFut} dias
                </div>
              ) : (
                <div className="space-y-2">
                  {futuros.map((a:any)=>(
                    <div key={a.id} className="flex items-center gap-4 border border-gray-100 rounded-xl px-4 py-3 hover:bg-gray-50">
                      <div className={`text-center flex-shrink-0 w-12
                        ${parseInt(a.dias_para_inicio)<=7?'text-red-500':parseInt(a.dias_para_inicio)<=30?'text-pmam-gold':'text-pmam-blue'}`}>
                        <p className="text-2xl font-bold leading-none">{a.dias_para_inicio}</p>
                        <p className="text-xs">dias</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{a.militar_nome}</p>
                        <p className="text-xs text-gray-400">{a.posto_graduacao} · {a.unidade_sigla}</p>
                        <p className="text-xs text-pmam-blue mt-0.5">{a.tipo_nome}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold">{fmtDt(a.data_inicio)} → {fmtDt(a.data_fim)}</p>
                        <p className="text-xs text-gray-400">{a.dias_total} dias</p>
                        <StatusBadge status={a.status}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {futPorMes.length > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Distribuição por Mês</p>
                  <MiniBarChart data={futPorMes} dataKey="total" nameKey="mes" color="#1B3060" height={100}/>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ╔═══════════════════════════════════════════════════════════════╗ */}
      {/* ║  ABA: FÉRIAS NÃO GOZADAS                                     ║ */}
      {/* ╚═══════════════════════════════════════════════════════════════╝ */}
      {tab==='nao_gozadas' && (
        <div className="space-y-4">
          {!naoGozLoad && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <StatCard icon={AlertTriangle} label="Sem férias em {ano}" value={naoGoz.length}
                sub="militares sem gozo registrado" color="bg-red-50 text-red-500" border="border-l-red-400"/>
              <StatCard icon={FileText} label="Com plano cadastrado"
                value={naoGoz.filter((m:any)=>m.tem_plano).length}
                sub="planejado mas não gozado" color="bg-yellow-50 text-yellow-700" border="border-l-yellow-400"/>
              <StatCard icon={AlertTriangle} label="Sem plano algum"
                value={naoGoz.filter((m:any)=>!m.tem_plano).length}
                sub="sem planejamento de férias" color="bg-red-50 text-red-600" border="border-l-red-500"/>
              <StatCard icon={CheckCircle} label="Gozaram férias"
                value={Math.max(0,(mapa?.militaresComFerias??0))}
                sub={`de ${mapa?.militaresAtivos??'?'} ativos`} color="bg-green-50 text-green-600" border="border-l-green-400"/>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-amber-800">
              <strong>Militares sem férias gozadas em {ano}</strong> — ativos que não possuem afastamento de férias aprovado, em andamento ou concluído.
            </p>
          </div>

          {naoGozLoad ? <Spinner/> : (
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-pmam-blue text-sm uppercase tracking-wide">
                  {naoGoz.length} militar(es) · {naoGoz.filter((m:any)=>m.tem_plano).length} com plano · {naoGoz.filter((m:any)=>!m.tem_plano).length} sem plano
                </h3>
                {naoGoz.length > 0 && (
                  <button onClick={()=>{
                    const h=['Militar','Posto','Matrícula','Unidade','Tem Plano','Período'];
                    const rows=naoGoz.map((m:any)=>[m.nome,m.posto_graduacao,m.matricula??'',m.unidade_sigla,m.tem_plano?'Sim':'Não',m.periodo1_inicio?`${fmtDt(m.periodo1_inicio)} - ${fmtDt(m.periodo1_fim)}`:'—'].join(';'));
                    const blob=new Blob([h.join(';')+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8;'});
                    const url=URL.createObjectURL(blob);const el=document.createElement('a');el.href=url;el.download=`ferias_nao_gozadas_${ano}.csv`;el.click();URL.revokeObjectURL(url);
                  }} className="btn-secondary flex items-center gap-1.5 text-sm"><Download size={14}/>CSV</button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-2 px-2 font-semibold">Militar</th>
                    <th className="pb-2 px-2 font-semibold">Posto</th>
                    <th className="pb-2 px-2 font-semibold">Unidade</th>
                    <th className="pb-2 px-2 font-semibold text-center">Plano</th>
                    <th className="pb-2 px-2 font-semibold">Período Planejado</th>
                    <th className="pb-2 px-2 font-semibold text-center">Dias Plan.</th>
                  </tr></thead>
                  <tbody>
                    {naoGoz.length===0 ? (
                      <tr><td colSpan={6} className="py-10 text-center">
                        <CheckCircle size={32} className="mx-auto mb-2 text-green-300"/>
                        <p className="text-green-600 font-semibold text-sm">Todos gozaram férias em {ano}!</p>
                      </td></tr>
                    ) : naoGoz.map((m:any,i:number)=>(
                      <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50 ${!m.tem_plano?'bg-red-50/30':''}`}>
                        <td className="py-2 px-2 font-semibold text-gray-800">{m.nome}</td>
                        <td className="py-2 px-2 text-gray-500 text-xs">{m.posto_graduacao}</td>
                        <td className="py-2 px-2 text-gray-500">{m.unidade_sigla}</td>
                        <td className="py-2 px-2 text-center">
                          {m.tem_plano
                            ? <span className="text-green-600 text-xs font-bold">✓ Sim</span>
                            : <span className="text-red-500 text-xs font-bold">✗ Não</span>}
                        </td>
                        <td className="py-2 px-2 text-xs text-gray-500 whitespace-nowrap">
                          {m.periodo1_inicio ? `${fmtDt(m.periodo1_inicio)} → ${fmtDt(m.periodo1_fim)}` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-pmam-blue">{m.dias_planejados??'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {naoGoz.length > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Com plano vs Sem plano</p>
                  <MiniPieChart data={[
                    { name: 'Com plano', value: naoGoz.filter((m:any)=>m.tem_plano).length },
                    { name: 'Sem plano', value: naoGoz.filter((m:any)=>!m.tem_plano).length },
                  ]} height={140}/>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ╔═══════════════════════════════════════════════════════════════╗ */}
      {/* ║  ABA: DETALHADO                                              ║ */}
      {/* ╚═══════════════════════════════════════════════════════════════╝ */}
      {tab==='detalhado' && (
        <div className="space-y-4">
          {/* Cards */}
          {!detLoad && detalhado.length > 0 && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <StatCard icon={BarChart3} label="Total Registros" value={detalhado.length}
                color="bg-blue-50 text-pmam-blue" border="border-l-pmam-blue"/>
              <StatCard icon={TrendingUp} label="Total Dias" value={detalhado.reduce((s,a)=>s+a.dias_total,0)}
                color="bg-pmam-gold/10 text-pmam-gold" border="border-l-pmam-gold"/>
              <StatCard icon={Users} label="Militares Distintos"
                value={new Set(detalhado.map((a:any)=>a.militar_nome)).size}
                color="bg-purple-50 text-purple-600" border="border-l-purple-400"/>
              <StatCard icon={Clock} label="Média de Dias"
                value={`${(detalhado.reduce((s,a)=>s+a.dias_total,0)/detalhado.length).toFixed(1)}d`}
                color="bg-green-50 text-green-600" border="border-l-green-400"/>
            </div>
          )}

          {/* Filtros */}
          <div className="card">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Mês</label>
                <select className="input" value={detMes} onChange={e=>setDetMes(e.target.value)}>
                  <option value="">Todos os meses</option>
                  {MESES_FULL.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tipo de Afastamento</label>
                <select className="input" value={detTipo} onChange={e=>setDetTipo(e.target.value)}>
                  <option value="">Todos os tipos</option>
                  {tipos.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={detStatus} onChange={e=>setDetStatus(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="reprovado">Reprovado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sub-views */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {([
              { id:'tipo',    label:'Por Tipo',     icon: BarChart3 },
              { id:'periodo', label:'Por Período',  icon: Calendar },
              { id:'efetivo', label:'Por Efetivo',  icon: Users },
            ] as {id:DetView;label:string;icon:any}[]).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={()=>setDetView(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold flex-1 justify-center transition-all
                  ${detView===id?'bg-white text-pmam-blue shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
                <Icon size={13}/>{label}
              </button>
            ))}
          </div>

          {detLoad ? <Spinner/> : detalhado.length===0 ? (
            <div className="card text-center py-12 text-gray-400 text-sm">
              <FileText size={36} className="mx-auto mb-2 text-gray-200"/>
              <p>Sem registros para o período selecionado</p>
            </div>
          ) : (
            <>
              {/* ── SUB: POR TIPO ──────────────────────────────────────── */}
              {detView==='tipo' && (
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-pmam-blue text-sm uppercase tracking-wide">Distribuição por Tipo de Afastamento</h3>
                    <button onClick={()=>{
                      const h=['Tipo','Qtd','Dias','%'];
                      const rows=detPorTipo.map(t=>[t.tipo,t.total,t.dias,t.pct].join(';'));
                      const blob=new Blob([h.join(';')+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8;'});
                      const url=URL.createObjectURL(blob);const el=document.createElement('a');el.href=url;el.download=`por_tipo_${ano}.csv`;el.click();URL.revokeObjectURL(url);
                    }} className="btn-secondary flex items-center gap-1.5 text-sm"><Download size={14}/>CSV</button>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="text-left text-xs text-gray-500 border-b">
                          <th className="pb-2 px-2 font-semibold">Tipo</th>
                          <th className="pb-2 px-2 font-semibold text-center">Qtd</th>
                          <th className="pb-2 px-2 font-semibold text-center">Dias</th>
                          <th className="pb-2 px-2 font-semibold text-center">%</th>
                          <th className="pb-2 px-2 font-semibold">Barra</th>
                        </tr></thead>
                        <tbody>
                          {detPorTipo.map((t,i)=>(
                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2 px-2 font-medium text-gray-800">{t.tipo}</td>
                              <td className="py-2 px-2 text-center font-bold text-pmam-blue">{t.total}</td>
                              <td className="py-2 px-2 text-center text-gray-500">{t.dias}d</td>
                              <td className="py-2 px-2 text-center text-gray-400">{t.pct}%</td>
                              <td className="py-2 px-2 w-24">
                                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div className="h-full rounded-full bg-pmam-blue" style={{width:`${Math.min(100,parseFloat(t.pct))}%`}}/>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <MiniPieChart data={detPorTipo.slice(0,7).map(t=>({ name: t.tipo.slice(0,22), value: t.total }))} height={200}/>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUB: POR PERÍODO ───────────────────────────────────── */}
              {detView==='periodo' && (
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-pmam-blue text-sm uppercase tracking-wide">Distribuição por Período (Mês)</h3>
                    <button onClick={()=>{
                      const h=['Mês','Afastamentos','Dias'];
                      const rows=detPorPeriodo.map(p=>[p.mes,p.total,p.dias].join(';'));
                      const blob=new Blob([h.join(';')+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8;'});
                      const url=URL.createObjectURL(blob);const el=document.createElement('a');el.href=url;el.download=`por_periodo_${ano}.csv`;el.click();URL.revokeObjectURL(url);
                    }} className="btn-secondary flex items-center gap-1.5 text-sm"><Download size={14}/>CSV</button>
                  </div>
                  <MiniBarChart data={detPorPeriodo} dataKey="total" nameKey="mes" color="#1B3060" height={160}/>
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-xs text-gray-500 border-b">
                        <th className="pb-2 px-2 font-semibold">Mês</th>
                        <th className="pb-2 px-2 font-semibold text-center">Afastamentos</th>
                        <th className="pb-2 px-2 font-semibold text-center">Total Dias</th>
                        <th className="pb-2 px-2 font-semibold text-center">Média Dias</th>
                      </tr></thead>
                      <tbody>
                        {detPorPeriodo.map((p,i)=>(
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 px-2 font-medium">{p.mes}</td>
                            <td className="py-2 px-2 text-center font-bold text-pmam-blue">{p.total}</td>
                            <td className="py-2 px-2 text-center text-gray-600">{p.dias}d</td>
                            <td className="py-2 px-2 text-center text-gray-400">{(p.dias/p.total).toFixed(1)}d</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-pmam-blue/20 bg-pmam-blue/5 font-bold">
                          <td className="py-2 px-2 text-pmam-blue">Total</td>
                          <td className="py-2 px-2 text-center text-pmam-blue">{detalhado.length}</td>
                          <td className="py-2 px-2 text-center text-pmam-blue">{detalhado.reduce((s,a)=>s+a.dias_total,0)}d</td>
                          <td className="py-2 px-2 text-center text-pmam-blue">
                            {(detalhado.reduce((s,a)=>s+a.dias_total,0)/detalhado.length).toFixed(1)}d
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── SUB: POR EFETIVO ───────────────────────────────────── */}
              {detView==='efetivo' && (
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-pmam-blue text-sm uppercase tracking-wide">
                      Por Efetivo — {detPorEfetivo.length} militar(es)
                    </h3>
                    <button onClick={()=>{
                      const h=['Militar','Posto','Matrícula','Afastamentos','Total Dias','Média Dias'];
                      const rows=detPorEfetivo.map(e=>[e.nome,e.posto,e.matricula,e.total,e.dias,(e.dias/e.total).toFixed(1)].join(';'));
                      const blob=new Blob([h.join(';')+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8;'});
                      const url=URL.createObjectURL(blob);const el=document.createElement('a');el.href=url;el.download=`por_efetivo_${ano}.csv`;el.click();URL.revokeObjectURL(url);
                    }} className="btn-secondary flex items-center gap-1.5 text-sm"><Download size={14}/>CSV</button>
                  </div>
                  <div className="space-y-2">
                    {detPorEfetivo.map((e,i)=>(
                      <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                        {/* Linha do militar */}
                        <button
                          className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                          onClick={()=>setEfeitoAberto(efeitoAberto===e.nome?null:e.nome)}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                            ${i===0?'bg-pmam-gold text-white':i===1?'bg-gray-400 text-white':i===2?'bg-amber-600 text-white':'bg-gray-100 text-gray-600'}`}>
                            {i+1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-sm">{e.nome}</p>
                            <p className="text-xs text-gray-400">{e.posto}{e.matricula&&` · Mat. ${e.matricula}`}</p>
                          </div>
                          <div className="flex items-center gap-6 flex-shrink-0">
                            <div className="text-center">
                              <p className="font-bold text-pmam-blue text-lg">{e.total}</p>
                              <p className="text-xs text-gray-400">afastamentos</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-pmam-gold text-lg">{e.dias}</p>
                              <p className="text-xs text-gray-400">dias</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-gray-600">{(e.dias/e.total).toFixed(1)}d</p>
                              <p className="text-xs text-gray-400">média</p>
                            </div>
                            {efeitoAberto===e.nome ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                          </div>
                        </button>
                        {/* Detalhe expandido */}
                        {efeitoAberto===e.nome && (
                          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                            <table className="w-full text-xs">
                              <thead><tr className="text-left text-gray-500 border-b border-gray-200">
                                <th className="pb-1.5 px-1 font-semibold">Tipo</th>
                                <th className="pb-1.5 px-1 font-semibold">Início</th>
                                <th className="pb-1.5 px-1 font-semibold">Fim</th>
                                <th className="pb-1.5 px-1 font-semibold text-center">Dias</th>
                                <th className="pb-1.5 px-1 font-semibold">Status</th>
                                <th className="pb-1.5 px-1 font-semibold text-center">Termo</th>
                              </tr></thead>
                              <tbody>
                                {e.registros.map((r:any)=>(
                                  <tr key={r.id} className="border-b border-gray-100 hover:bg-white">
                                    <td className="py-1.5 px-1 text-gray-700 max-w-[160px] truncate">{r.tipo_nome}</td>
                                    <td className="py-1.5 px-1 whitespace-nowrap">{fmtDt(r.data_inicio)}</td>
                                    <td className="py-1.5 px-1 whitespace-nowrap">{fmtDt(r.data_fim)}</td>
                                    <td className="py-1.5 px-1 text-center font-bold text-pmam-blue">{r.dias_total}</td>
                                    <td className="py-1.5 px-1"><StatusBadge status={r.status}/></td>
                                    <td className="py-1.5 px-1 text-center">
                                      {r.termo_url_assinado?<span className="text-green-500 font-bold" title="Assinado">✓</span>
                                       :r.termo_url?<span className="text-pmam-gold font-bold" title="Gerado">◉</span>
                                       :<span className="text-gray-300">—</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {e.registros[0]?.motivo && <p className="text-xs text-gray-500 mt-2 italic">Motivo: {e.registros[0].motivo}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Mini gráfico top militares */}
                  {detPorEfetivo.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Dias por Militar (Top 10)</p>
                      <MiniBarChart
                        data={detPorEfetivo.slice(0,10).map(e=>({ nome: e.nome.split(' ')[0], dias: e.dias }))}
                        dataKey="dias" nameKey="nome" color="#C8960C" height={110}/>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
