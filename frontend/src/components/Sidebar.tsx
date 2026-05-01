import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarRange, Calendar,
  BarChart3, Settings, LogOut, Shield, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const navItemsAdmin = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/militares', icon: Users, label: 'Militares' },
  { to: '/afastamentos', icon: CalendarRange, label: 'Afastamentos' },
  { to: '/plano-ferias', icon: Calendar, label: 'Controle Geral' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
];

const navItemsMilitar = [
  { to: '/', icon: LayoutDashboard, label: 'Meu Painel', exact: true },
  { to: '/afastamentos', icon: CalendarRange, label: 'Meus Afastamentos' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  function handleLogout() {
    logout();
    toast.success('Sessão encerrada');
    navigate('/login');
  }

  function handleNavClick() {
    onClose();
  }

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-30 w-64 min-h-screen bg-pmam-blue-dark flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo + botão fechar mobile */}
        <div className="px-4 py-4 border-b border-pmam-blue">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Brasão PMAM */}
              <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                {!imgError ? (
                  <img
                    src="/brasao.png"
                    alt="Brasão PMAM"
                    className="w-10 h-10 object-contain"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <Shield className="text-pmam-gold" size={36} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm leading-tight">PMAM</p>
                <p className="text-pmam-gold text-xs font-medium leading-tight">SCAF</p>
              </div>
            </div>
            {/* Botão fechar — só em mobile */}
            <button
              onClick={onClose}
              className="lg:hidden text-gray-400 hover:text-white p-1 rounded transition-colors flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-gray-400 text-xs mt-2 leading-tight">
            Sistema de Controle de Afastamentos
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {(user?.perfil === 'militar' ? navItemsMilitar : navItemsAdmin).map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-pmam-gold text-white'
                    : 'text-gray-300 hover:bg-pmam-blue hover:text-white'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </NavLink>
          ))}

          {user?.perfil === 'admin' && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">Administração</p>
              </div>
              <NavLink
                to="/configuracoes"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-pmam-gold text-white' : 'text-gray-300 hover:bg-pmam-blue hover:text-white'
                  }`
                }
              >
                <Settings size={18} className="flex-shrink-0" />
                <span className="whitespace-nowrap">Configurações</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-pmam-blue">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-pmam-gold flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.nome?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.nome}</p>
              <p className="text-gray-400 text-xs truncate capitalize">{user?.perfil}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-400 hover:text-red-400 text-xs transition-colors w-full"
          >
            <LogOut size={14} />
            <span>Sair do sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
}
