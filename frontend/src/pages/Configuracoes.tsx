import { useEffect, useState } from 'react';
import { Plus, Save, Trash2, Key, Edit2, X } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import type { Unidade } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function Configuracoes() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [newUser, setNewUser] = useState({ nome: '', email: '', senha: '', perfil: 'operador', unidade_id: '' });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editData, setEditData] = useState({ nome: '', email: '', perfil: '', nova_senha: '' });

  useEffect(() => {
    Promise.all([api.get('/usuarios'), api.get('/unidades')])
      .then(([u, un]) => { setUsuarios(u.data); setUnidades(un.data); });
  }, []);

  async function createUser() {
    if (!newUser.nome || !newUser.email || !newUser.senha) return toast.error('Preencha todos os campos');
    setLoading(true);
    try {
      const res = await api.post('/usuarios', { ...newUser, unidade_id: newUser.unidade_id || null });
      setUsuarios(prev => [...prev, res.data]);
      setNewUser({ nome: '', email: '', senha: '', perfil: 'operador', unidade_id: '' });
      setShowForm(false);
      toast.success('Usuário criado!');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  }

  async function toggleUser(id: number, ativo: boolean) {
    try {
      await api.put(`/usuarios/${id}`, { ativo: !ativo });
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ativo: !ativo } : u));
      toast.success(`Usuário ${!ativo ? 'ativado' : 'desativado'}`);
    } catch { toast.error('Erro'); }
  }

  async function deleteUser(id: number, nome: string) {
    if (!confirm(`Excluir o usuário "${nome}"? Esta ação desativará o acesso permanentemente.`)) return;
    try {
      await api.delete(`/usuarios/${id}`);
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ativo: false } : u));
      toast.success('Usuário desativado');
    } catch { toast.error('Erro ao excluir'); }
  }

  function openEdit(u: any) {
    setEditUser(u);
    setEditData({ nome: u.nome, email: u.email, perfil: u.perfil, nova_senha: '' });
  }

  async function saveEdit() {
    if (!editUser) return;
    setLoading(true);
    try {
      const payload: any = { nome: editData.nome, email: editData.email, perfil: editData.perfil };
      if (editData.nova_senha) payload.senha = editData.nova_senha;
      const res = await api.put(`/usuarios/${editUser.id}`, payload);
      setUsuarios(prev => prev.map(u => u.id === editUser.id ? { ...u, ...res.data } : u));
      setEditUser(null);
      toast.success('Usuário atualizado!');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Erro ao atualizar');
    } finally { setLoading(false); }
  }

  async function alterarSenha() {
    if (!senhaAtual || !novaSenha) return toast.error('Preencha os campos');
    try {
      await api.put('/auth/senha', { senha_atual: senhaAtual, nova_senha: novaSenha });
      toast.success('Senha alterada!');
      setSenhaAtual(''); setNovaSenha('');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Erro ao alterar senha');
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Modal de edição */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-pmam-blue">Editar Usuário</h3>
              <button onClick={() => setEditUser(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Nome</label>
                <input className="input" value={editData.nome} onChange={e => setEditData(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input type="email" className="input" value={editData.email} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Perfil</label>
                <select className="input" value={editData.perfil} onChange={e => setEditData(p => ({ ...p, perfil: e.target.value }))}>
                  <option value="operador">Operador</option>
                  <option value="comandante">Comandante</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="label">Nova Senha (deixe em branco para manter)</label>
                <input type="password" className="input" placeholder="••••••••" value={editData.nova_senha} onChange={e => setEditData(p => ({ ...p, nova_senha: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={saveEdit} disabled={loading} className="btn-primary flex items-center gap-2 text-sm">
                <Save size={14}/> {loading ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setEditUser(null)} className="btn-secondary text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {/* Alterar senha */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Key size={18} className="text-pmam-blue" />
          <h3 className="font-bold text-pmam-blue">Alterar Minha Senha</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Senha Atual</label>
            <input type="password" className="input" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} />
          </div>
          <div>
            <label className="label">Nova Senha</label>
            <input type="password" className="input" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
          </div>
        </div>
        <button onClick={alterarSenha} className="btn-primary mt-4 flex items-center gap-2">
          <Save size={15} /> Alterar Senha
        </button>
      </div>

      {/* Gestão de usuários */}
      {user?.perfil === 'admin' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-pmam-blue">Usuários do Sistema</h3>
            <button onClick={() => setShowForm(s => !s)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={15} /> Novo Usuário
            </button>
          </div>

          {showForm && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-pmam-blue mb-3">Novo Usuário</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Nome Completo</label>
                  <input className="input" value={newUser.nome} onChange={e => setNewUser(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div>
                  <label className="label">E-mail</label>
                  <input type="email" className="input" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Senha Inicial</label>
                  <input type="password" className="input" value={newUser.senha} onChange={e => setNewUser(p => ({ ...p, senha: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Perfil</label>
                  <select className="input" value={newUser.perfil} onChange={e => setNewUser(p => ({ ...p, perfil: e.target.value }))}>
                    <option value="operador">Operador</option>
                    <option value="comandante">Comandante</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="label">Unidade</label>
                  <select className="input" value={newUser.unidade_id} onChange={e => setNewUser(p => ({ ...p, unidade_id: e.target.value }))}>
                    <option value="">Todas / Sem unidade</option>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.sigla}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <button onClick={createUser} disabled={loading} className="btn-primary flex items-center gap-2 text-sm">
                  <Save size={14} /> {loading ? 'Salvando...' : 'Criar Usuário'}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 font-semibold">Nome</th>
                  <th className="pb-2 font-semibold">E-mail</th>
                  <th className="pb-2 font-semibold">Perfil</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-center">Ação</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u: any) => (
                  <tr key={u.id} className="border-b border-gray-50">
                    <td className="py-2.5 font-medium">{u.nome}</td>
                    <td className="py-2.5 text-gray-500 text-xs">{u.email}</td>
                    <td className="py-2.5 capitalize text-xs">{u.perfil}</td>
                    <td className="py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(u)}
                          className="p-1.5 rounded text-pmam-blue hover:bg-blue-50" title="Editar">
                          <Edit2 size={13} />
                        </button>
                        {u.id !== user?.id && (
                          <>
                            <button onClick={() => toggleUser(u.id, u.ativo)}
                              className={`p-1.5 rounded text-xs ${u.ativo ? 'text-amber-500 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                              title={u.ativo ? 'Desativar' : 'Ativar'}>
                              {u.ativo ? '⏸' : '▶'}
                            </button>
                            <button onClick={() => deleteUser(u.id, u.nome)}
                              className="p-1.5 rounded text-red-500 hover:bg-red-50" title="Excluir">
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
