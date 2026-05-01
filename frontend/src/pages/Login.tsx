import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) { navigate('/'); return null; }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !senha) return toast.error('Preencha e-mail e senha');
    setLoading(true);
    try {
      await login(email, senha);
      toast.success('Bem-vindo ao SCAF!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pmam-blue-dark via-pmam-blue to-pmam-blue-light">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #C8960C 0, #C8960C 1px, transparent 0, transparent 50%)',
          backgroundSize: '20px 20px',
        }} />
      </div>

      <div className="relative w-full max-w-md px-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-pmam-blue-dark to-pmam-blue px-8 pt-8 pb-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-pmam-gold/20 mb-4">
              <Shield className="text-pmam-gold" size={44} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">PMAM</h1>
            <p className="text-pmam-gold text-sm font-semibold mt-1">
              SCAF – Sistema de Controle de Afastamentos
            </p>
            <p className="text-gray-300 text-xs mt-1">
              Polícia Militar do Estado do Amazonas
            </p>
          </div>

          {/* Overlap card */}
          <div className="px-8 pt-6 pb-8 -mt-4 bg-white rounded-t-2xl relative z-10">
            <h2 className="text-lg font-bold text-pmam-blue mb-6 text-center">Acesso ao Sistema</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input pl-9"
                    placeholder="seu@email.com"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="label">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type={show ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    className="input pl-9 pr-10"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-pmam-gold hover:bg-pmam-gold-dark text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Entrar'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-gray-300 text-xs mt-6 opacity-70">
          © {new Date().getFullYear()} Polícia Militar do Estado do Amazonas
        </p>
      </div>
    </div>
  );
}
