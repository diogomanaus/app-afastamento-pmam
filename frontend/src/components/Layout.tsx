import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Bell, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/militares': 'Militares',
  '/militares/novo': 'Novo Militar',
  '/afastamentos': 'Afastamentos',
  '/afastamentos/novo': 'Novo Afastamento',
  '/plano-ferias': 'Plano Anual de Férias',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
};

export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const title = PAGE_TITLES[location.pathname] ?? 'SCAF – PMAM';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Conteúdo principal — em desktop desloca pela largura do sidebar */}
      <div className="flex-1 flex flex-col lg:ml-64">

        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Botão hambúrguer — só aparece em mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-pmam-blue hover:bg-gray-100 transition-colors"
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-base lg:text-lg font-bold text-pmam-blue leading-tight">{title}</h1>
              <p className="text-xs text-gray-400 hidden sm:block">
                Polícia Militar do Estado do Amazonas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            <button className="relative text-gray-400 hover:text-pmam-blue transition-colors">
              <Bell size={20} />
            </button>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800 truncate max-w-[120px] lg:max-w-none">{user?.nome}</p>
              <p className="text-xs text-pmam-gold capitalize">{user?.perfil}</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>

        <footer className="text-center py-3 text-xs text-gray-400 border-t border-gray-100">
          SCAF – Sistema de Controle de Afastamentos © {new Date().getFullYear()} | PMAM
        </footer>
      </div>
    </div>
  );
}
