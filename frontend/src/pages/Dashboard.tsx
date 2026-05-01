import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, CalendarRange, Clock, AlertTriangle, Plus, TrendingUp, BookOpen, ArrowRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const PIE_COLORS = ['#C8960C','#1B3060','#2D5FA3','#10B981','#EF4444','#6B7280'];

interface Resumo {
  totais: { total: string; em_andamento: string; pendentes: string; total_dias: string };
  porStatus: { status: string; qtd: string }[];
  porTipo: { tipo: string; qtd: string }[];
  proximosAfastamentos: any[];
  militaresAtivos: string;
  naoGozados: string;
}

export default function Dashboard() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [mensal, setMensal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/relatorios/resumo'),
      api.get('/relatorios/mensal'),
    ]).then(([r, m]) => {
      setResumo(r.data);
      setMensal(m.data);
    }).finally(() => setLoading(false));
  }, []);

  const mensalChart = MESES.map((mes, i) => {
    const d = mensal.find((r: any) => parseInt(r.mes) === i + 1);
    return { mes, total: d ? parseInt(d.total) : 0 };
  });

  const tipoChart = resumo?.porTipo.slice(0, 6).map(t => ({
    name: t.tipo.length > 20 ? t.tipo.slice(0, 20) + '…' : t.tipo,
    value: parseInt(t.qtd),
  })) ?? [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-pmam-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Militares Ativos',  value: resumo?.militaresAtivos ?? 0,        icon: Users,         color: 'bg-blue-50 text-pmam-blue',     border: 'border-l-pmam-blue' },
          { label: 'Em Andamento',      value: resumo?.totais.em_andamento ?? 0,    icon: Clock,         color: 'bg-blue-50 text-blue-600',      border: 'border-l-blue-400' },
          { label: 'Pendentes',         value: resumo?.totais.pendentes ?? 0,       icon: TrendingUp,    color: 'bg-yellow-50 text-yellow-700',  border: 'border-l-yellow-400' },
          { label: 'Férias Não Gozadas',value: resumo?.naoGozados ?? 0,             icon: AlertTriangle, color: 'bg-red-50 text-red-600',        border: 'border-l-red-400' },
        ].map(({ label, value, icon: Icon, color, border }) => (
          <div key={label} className={`card border-l-4 ${border} flex items-center gap-4`}>
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-pmam-blue">Afastamentos por Mês</h3>
            <span className="text-xs text-gray-400">{new Date().getFullYear()}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mensalChart}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#C8960C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h3 className="font-bold text-pmam-blue mb-4">Por Tipo</h3>
          {tipoChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={tipoChart} cx="50%" cy="45%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3}>
                  {tipoChart.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Sem dados no período
            </div>
          )}
        </div>
      </div>

      {/* Acesso rápido — Livro de Afastamento */}
      <Link to="/afastamentos" className="block">
        <div className="card border border-pmam-gold/50 bg-gradient-to-r from-pmam-gold/10 to-transparent hover:from-pmam-gold/20 transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-pmam-gold/20 flex-shrink-0">
              <BookOpen size={24} className="text-pmam-gold" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-pmam-gold uppercase tracking-wider">Acesso Rápido</p>
              <h3 className="font-bold text-pmam-blue text-base mt-0.5">Livro de Afastamento</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Preencha e assine o Termo de Início de Gozo de Férias — documento oficial ABNT
              </p>
            </div>
            <ArrowRight size={20} className="text-pmam-gold flex-shrink-0" />
          </div>
        </div>
      </Link>

      {/* Próximos afastamentos */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-pmam-blue">Próximos Afastamentos</h3>
          <Link to="/afastamentos/novo" className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3">
            <Plus size={16} /> Novo Afastamento
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-semibold">Militar</th>
                <th className="pb-2 font-semibold">Tipo</th>
                <th className="pb-2 font-semibold">Início</th>
                <th className="pb-2 font-semibold">Fim</th>
                <th className="pb-2 font-semibold">Dias</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {resumo?.proximosAfastamentos.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Nenhum afastamento próximo
                  </td>
                </tr>
              )}
              {resumo?.proximosAfastamentos.map((a: any) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5">
                    <p className="font-medium text-gray-800">{a.militar_nome}</p>
                    <p className="text-xs text-gray-400">{a.posto_graduacao} · {a.unidade_sigla}</p>
                  </td>
                  <td className="py-2.5 text-gray-600">{a.tipo_nome}</td>
                  <td className="py-2.5 text-gray-600">
                    {format(new Date(a.data_inicio.split('T')[0] + 'T12:00:00'), 'dd/MM/yyyy')}
                  </td>
                  <td className="py-2.5 text-gray-600">
                    {format(new Date(a.data_fim.split('T')[0] + 'T12:00:00'), 'dd/MM/yyyy')}
                  </td>
                  <td className="py-2.5 text-center font-medium text-pmam-blue">{a.dias_total}</td>
                  <td className="py-2.5"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
