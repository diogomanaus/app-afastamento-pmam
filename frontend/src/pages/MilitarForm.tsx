import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, KeyRound, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { POSTOS_GRADUACOES } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface FormData {
  nome: string; cpf: string; rg: string; matricula: string;
  posto_graduacao: string; email: string; telefone: string;
  data_ingresso: string; data_nascimento: string; sexo: string; observacoes: string;
}

interface AcessoInfo { id: number; email: string; ativo: boolean; ultimo_acesso?: string; }

export default function MilitarForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [acesso, setAcesso] = useState<AcessoInfo | null | undefined>(undefined);
  const [acessoEmail, setAcessoEmail] = useState('');
  const [acessoSenha, setAcessoSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [savingAcesso, setSavingAcesso] = useState(false);
  const [revogando, setRevogando] = useState(false);
  const isEdit = Boolean(id);
  const isAdmin = user?.perfil === 'admin';

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    if (isEdit) {
      api.get(`/militares/${id}`).then(r => {
        const m = r.data;
        reset({ ...m, data_ingresso: m.data_ingresso?.split('T')[0] ?? '', data_nascimento: m.data_nascimento?.split('T')[0] ?? '' });
      });
      if (isAdmin) {
        api.get(`/militares/${id}/acesso`).then(r => {
          setAcesso(r.data);
          if (r.data?.email) setAcessoEmail(r.data.email);
        }).catch(() => setAcesso(null));
      }
    }
  }, [id]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      if (isEdit) { await api.put(`/militares/${id}`, data); toast.success('Militar atualizado!'); }
      else { await api.post('/militares', data); toast.success('Militar cadastrado!'); }
      navigate('/militares');
    } catch (err: any) { toast.error(err.response?.data?.error ?? 'Erro ao salvar'); }
    finally { setLoading(false); }
  }

  async function salvarAcesso() {
    if (!acessoEmail) return toast.error('Informe o e-mail');
    if (!acesso && !acessoSenha) return toast.error('Informe a senha para criar o acesso');
    if (acessoSenha && acessoSenha.length < 6) return toast.error('Senha deve ter ao menos 6 caracteres');
    setSavingAcesso(true);
    try {
      await api.post(`/militares/${id}/acesso`, { email: acessoEmail, senha: acessoSenha || undefined });
      toast.success(acesso ? 'Acesso atualizado!' : 'Acesso criado com sucesso!');
      const r = await api.get(`/militares/${id}/acesso`);
      setAcesso(r.data); setAcessoSenha('');
    } catch (err: any) { toast.error(err.response?.data?.error ?? 'Erro ao configurar acesso'); }
    finally { setSavingAcesso(false); }
  }

  async function revogarAcesso() {
    if (!confirm('Revogar acesso deste militar? Ele não conseguirá mais fazer login.')) return;
    setRevogando(true);
    try {
      await api.delete(`/militares/${id}/acesso`);
      toast.success('Acesso revogado');
      setAcesso(prev => prev ? { ...prev, ativo: false } : prev);
    } catch (err: any) { toast.error(err.response?.data?.error ?? 'Erro'); }
    finally { setRevogando(false); }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/militares')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-pmam-blue" />
        </button>
        <h2 className="text-lg font-bold text-pmam-blue">{isEdit ? 'Editar Militar' : 'Cadastrar Novo Militar'}</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-pmam-blue/5 border border-pmam-blue/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-pmam-gold flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500 font-medium">Unidade</p>
            <p className="text-sm font-bold text-pmam-blue">Diretoria de Inativos da PMAM – DINATIV</p>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-bold text-pmam-blue uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">Dados Pessoais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nome Completo *</label>
              <input className="input" {...register('nome', { required: 'Nome é obrigatório' })} />
              {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
            </div>
            <div>
              <label className="label">CPF *</label>
              <input className="input" placeholder="000.000.000-00" {...register('cpf', { required: 'CPF é obrigatório' })} />
              {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf.message}</p>}
            </div>
            <div>
              <label className="label">RG *</label>
              <input className="input" {...register('rg', { required: 'RG é obrigatório' })} />
              {errors.rg && <p className="text-red-500 text-xs mt-1">{errors.rg.message}</p>}
            </div>
            <div>
              <label className="label">Data de Nascimento</label>
              <input type="date" className="input" {...register('data_nascimento')} />
            </div>
            <div>
              <label className="label">Sexo</label>
              <select className="input" {...register('sexo')}>
                <option value="">Selecione</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-bold text-pmam-blue uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">Dados Funcionais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Posto / Graduação *</label>
              <select className="input" {...register('posto_graduacao', { required: 'Obrigatório' })}>
                <option value="">Selecione...</option>
                {POSTOS_GRADUACOES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.posto_graduacao && <p className="text-red-500 text-xs mt-1">{errors.posto_graduacao.message}</p>}
            </div>
            <div>
              <label className="label">Matrícula</label>
              <input className="input" {...register('matricula')} />
            </div>
            <div>
              <label className="label">Data de Ingresso</label>
              <input type="date" className="input" {...register('data_ingresso')} />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-bold text-pmam-blue uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">Contato</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" {...register('email')} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" placeholder="(92) 99999-9999" {...register('telefone')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={3} {...register('observacoes')} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/militares')} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            {loading ? 'Salvando...' : isEdit ? 'Atualizar' : 'Cadastrar'}
          </button>
        </div>
      </form>

      {/* Seção de Acesso ao Sistema — só em edição e para admin */}
      {isEdit && isAdmin && (
        <div className="mt-5 card border border-pmam-blue/30">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
            <div className="p-2 rounded-xl bg-pmam-blue/10">
              <KeyRound size={18} className="text-pmam-blue" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-pmam-blue">Acesso ao Sistema</h3>
              <p className="text-xs text-gray-400">Permite que o militar faça login e veja seus próprios dados</p>
            </div>
            {acesso !== undefined && (
              acesso?.ativo
                ? <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-semibold"><CheckCircle size={14}/> Ativo</span>
                : acesso
                ? <span className="ml-auto flex items-center gap-1 text-xs text-red-500 font-semibold"><XCircle size={14}/> Revogado</span>
                : <span className="ml-auto text-xs text-gray-400">Sem acesso</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">E-mail de Login</label>
              <input
                type="email"
                className="input"
                value={acessoEmail}
                onChange={e => setAcessoEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="label">{acesso ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</label>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  className="input pr-10"
                  value={acessoSenha}
                  onChange={e => setAcessoSenha(e.target.value)}
                  placeholder={acesso ? '••••••••' : 'mínimo 6 caracteres'}
                />
                <button type="button" onClick={() => setShowSenha(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showSenha ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={salvarAcesso}
              disabled={savingAcesso}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <KeyRound size={14}/>
              {savingAcesso ? 'Salvando...' : acesso ? 'Atualizar Acesso' : 'Criar Acesso'}
            </button>
            {acesso?.ativo && (
              <button
                type="button"
                onClick={revogarAcesso}
                disabled={revogando}
                className="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
              >
                {revogando ? 'Revogando...' : 'Revogar Acesso'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
