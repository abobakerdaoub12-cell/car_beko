import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppProvider, useApp } from '@/context/AppContext';
import { Login } from '@/pages/Login';
import { Layout, type PageKey } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Inventory } from '@/pages/Inventory';
import { Shipments } from '@/pages/Shipments';
import { Capital } from '@/pages/Capital';
import { Trips } from '@/pages/Trips';
import { Invoices } from '@/pages/Invoices';
import { Shops } from '@/pages/Shops';
import { MySales } from '@/pages/MySales';
import { Users } from '@/pages/Users';
import { Settings, Loader2 } from 'lucide-react';

function AppInner() {
  const { role, loading: dataLoading, error } = useApp();
  const [page, setPage] = useState<PageKey>('dashboard');

  const effectivePage: PageKey =
    role === 'sales' && (page === 'shipments' || page === 'users' || page === 'capital') ? 'dashboard' : page;

  const navigate = (p: PageKey) => {
    if (role === 'sales' && (p === 'shipments' || p === 'users' || p === 'capital')) return;
    setPage(p);
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-sm text-secondary-500 font-medium">جارٍ تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-error-100 items-center justify-center text-error-600 mb-4">
            <Settings className="w-7 h-7" />
          </div>
          <p className="text-secondary-800 font-semibold mb-1">{error}</p>
          <p className="text-sm text-secondary-500">الرجاء إعادة المحاولة</p>
        </div>
      </div>
    );
  }

  return (
    <Layout current={effectivePage} onNavigate={navigate}>
      {effectivePage === 'dashboard' && <Dashboard onNavigate={navigate} />}
      {effectivePage === 'inventory' && <Inventory />}
      {effectivePage === 'shipments' && <Shipments />}
      {effectivePage === 'capital' && <Capital />}
      {effectivePage === 'trips' && <Trips />}
      {effectivePage === 'invoices' && <Invoices />}
      {effectivePage === 'shops' && <Shops />}
      {effectivePage === 'my-sales' && <MySales />}
      {effectivePage === 'users' && <Users />}
    </Layout>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

export default App;
