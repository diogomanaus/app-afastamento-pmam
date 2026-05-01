import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Save, Info } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import type { Militar, TipoAfastamento } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';

export default function AfastamentoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [militares, setMilitares] = useState<Militar[]>([]);
  const [tipos, setTipos] = useState<TipoAfastamento[]>([]);
  const [militarId, setMilitarId] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [feriasAnoBase, setFeriasAnoBase] = useState('');
  const [feriasAnoExercicio, setFeriasAnoExercicio] = useState('');
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const isMilitar = user?.perfil === "militar";

  const diasTotal = dataInicio && dataFim
    ? differenceInCalendarDays(parseISO(dataFim), parseISO(dataInicio)) + 1
    : 0;

  const tipoSelecionado = tipos.find(t => String(t.id) === tipoId);

  useEffect(() => {
    if (isMilitar && user?.militar_id) {
      setMilitarId(String(user.militar_id));
    }
    Promise.all([
      api.get('/militares', { params: { limit: 500 } }),
      api.get('/afastamentos/tipos'),
    ]).then(([m, t]) => {
      setMilitares(m.data.data);
      setTipos(t.data);
    });

    if (isEdit) {
      api.get(`/afastamentos/${id}`).then(r => {
        const a = r.data;
        setMilitarId(String(a.militar_id));
        setTipoId(String(a.tipo_id));
        setDataInicio(a.data_inicio?.split('T')[0] ?? '');
        setDataFim(a.data_fim?.split('T')[0] ?? '');
        setMotivo(a.motivo ?? '');
        setObservacoes(a.observacoes ?? '');
        setFeriasAnoBase(a.ferias_ano_base ? String(a.ferias_ano_base) : '');
        setFeriasAnoExercicio(a.ferias_ano_exercicio ? String(a.ferias_ano_exercicio) : '');
      });
    }
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!militarId || !tipoId || !dataInicio || !dataFim) {
      return toast.error('Preencha todos os campos obrigatórios');
    }
    if (diasTotal <= 0) return toast.error('Data de fim deve ser posterior à data de início');

    const payload = {
      militar_id: isMilitar && user?.militar_id ? user.militar_id : parseInt(militarId),
      tipo_id: parseInt(tipoId),
      data_inicio: dataInicio,
      data_fim: dataFim,
      motivo,
      observacoes,
      ferias_ano_base: feriasAnoBase ? parseInt(feriasAnoBase) : null,
      ferias_ano_exercicio: feriasAnoExercicio ? parseInt(feriasAnoExercicio) : null,
    };

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/afastamentos/${id}`, payload);
        toast.success('Afastamento atualizado!');
        navigate('/afastamentos');
      } else {
        const res = await api.post('/afastamentos', payload);
        toast.success('Afastamento registrado com sucesso!');
        navigate(`/afastamentos/${res.data.id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/afastamentos')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-pmam-blue" />
        </button>
        <h2 className="text-lg font-bold text-pmam-blue">
          {isEdit ? 'Editar Afastamento' : 'Registrar Afastamento'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Unidade fixa */}
        <div className="bg-pmam-blue/5 border border-pmam-blue/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-pmam-gold flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500 font-medium">Unidade</p>
            <p className="text-sm font-bold text-pmam-blue">Diretoria de Inativos da PMAM – DINATIV</p>
          </div>
        </div>

        {/* Seleção do Militar */}
        <div className="card">
          <h3 className="text-sm font-bold text-pmam-blue uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
            Identificação do Militar
          </h3>
          <div>
            <label className="label">Militar *</label>
            <select className="input" value={militarId} onChange={e => setMilitarId(e.target.value)} required>
              <option value="">Selecione o militar...</option>
              {militares.map(m => (
                <option key={m.id} value={m.id}>
                  {m.posto_graduacao} {m.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tipo de Afastamento */}
        <div className="card">
          <h3 className="text-sm font-bold text-pmam-blue uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
            Tipo de Afastamento
          </h3>
          <div>
            <label className="label">Tipo *</label>
            <select className="input" value={tipoId} onChange={e => setTipoId(e.target.value)} required>
              <option value="">Selecione o tipo...</option>
              {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          {tipoSelecionado && (
            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex gap-2">
              <Info size={16} className="text-pmam-blue mt-0.5 flex-shrink-0" />
              <div className="text-xs text-pmam-blue space-y-0.5">
                {tipoSelecionado.fundamentacao_legal && (
                  <p><strong>Base legal:</strong> {tipoSelecionado.fundamentacao_legal}</p>
                )}
                {tipoSelecionado.prazo_maximo_dias && (
                  <p><strong>Prazo máximo:</strong> {tipoSelecionado.prazo_maximo_dias} dias</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Campos extras para Férias */}
        {tipoSelecionado?.nome === 'Férias Regulamentares' && (
          <div className="card border border-pmam-gold/30 bg-pmam-gold/5">
            <h3 className="text-sm font-bold text-pmam-blue uppercase tracking-wide mb-4 pb-2 border-b border-pmam-gold/20">
              Dados das Férias
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Ano Base *</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Ex: 2024"
                  min="2000" max="2099"
                  value={feriasAnoBase}
                  onChange={e => setFeriasAnoBase(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Ano em que as férias foram adquiridas</p>
              </div>
              <div>
                <label className="label">Ano de Exercício *</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Ex: 2025"
                  min="2000" max="2099"
                  value={feriasAnoExercicio}
                  onChange={e => setFeriasAnoExercicio(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Ano em que as férias serão gozadas</p>
              </div>
            </div>
          </div>
        )}

        {/* Período */}
        <div className="card">
          <h3 className="text-sm font-bold text-pmam-blue uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
            Período do Afastamento
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-1.5">
                <Calendar size={14} /> Data de Início *
              </label>
              <input
                type="date"
                className="input"
                value={dataInicio}
                onChange={e => {
                  setDataInicio(e.target.value);
                  if (dataFim && e.target.value > dataFim) setDataFim('');
                }}
                required
              />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <Calendar size={14} /> Data de Fim *
              </label>
              <input
                type="date"
                className="input"
                value={dataFim}
                min={dataInicio}
                onChange={e => setDataFim(e.target.value)}
                required
              />
            </div>
          </div>

          {diasTotal > 0 && (
            <div className="mt-4 bg-pmam-gold/10 border border-pmam-gold/30 rounded-lg px-4 py-3">
              <p className="font-bold text-center text-pmam-blue">
                Total: <span className="text-2xl">{diasTotal}</span> {diasTotal === 1 ? 'dia' : 'dias'}
              </p>
              {tipoSelecionado?.prazo_maximo_dias && diasTotal > tipoSelecionado.prazo_maximo_dias && (
                <p className="text-red-500 text-xs text-center mt-1">
                  ⚠ Período excede o prazo máximo de {tipoSelecionado.prazo_maximo_dias} dias
                </p>
              )}
            </div>
          )}
        </div>

        {/* Motivo */}
        <div className="card">
          <h3 className="text-sm font-bold text-pmam-blue uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
            Motivo e Observações
          </h3>
          <div className="space-y-4">
            <div>
              <label className="label">Motivo Declarado</label>
              <textarea
                className="input resize-none"
                rows={4}
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Descreva o motivo (será incluído no documento oficial)..."
              />
            </div>
            <div>
              <label className="label">Observações Internas</label>
              <textarea
                className="input resize-none"
                rows={2}
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Observações para uso interno..."
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/afastamentos')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            {loading ? 'Salvando...' : isEdit ? 'Atualizar' : 'Registrar Afastamento'}
          </button>
        </div>
      </form>
    </div>
  );
}
