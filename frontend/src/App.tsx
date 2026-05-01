import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Militares from './pages/Militares';
import MilitarForm from './pages/MilitarForm';
import Afastamentos from './pages/Afastamentos';
import AfastamentoForm from './pages/AfastamentoForm';
import AfastamentoDetalhes from './pages/AfastamentoDetalhes';
import PlanoFerias from './pages/PlanoFerias';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';
import TermoAfastamento from './pages/TermoAfastamento';

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-pmam-blue border-t-transparent rounded-full animate-spin"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoutes />}>
        <Route index element={<Dashboard />} />
        <Route path="militares" element={<Militares />} />
        <Route path="militares/novo" element={<MilitarForm />} />
        <Route path="militares/:id/editar" element={<MilitarForm />} />
        <Route path="afastamentos" element={<Afastamentos />} />
        <Route path="afastamentos/novo" element={<AfastamentoForm />} />
        <Route path="afastamentos/:id" element={<AfastamentoDetalhes />} />
        <Route path="afastamentos/:id/editar" element={<AfastamentoForm />} />
        <Route path="afastamentos/:id/termo" element={<TermoAfastamento />} />
        <Route path="plano-ferias" element={<PlanoFerias />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
