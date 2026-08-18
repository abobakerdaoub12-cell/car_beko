import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Package,
  Ship,
  FileText,
  Users,
  BarChart3,
  UserCog,
  Settings,
  UserCheck,
  LogOut,
  Menu,
  Truck,
  Database,
  WalletCards,
  Clock
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { BackupRestoreModal } from '@/components/BackupRestoreModal';

export type PageKey =
  | 'dashboard'
  | 'inventory'
  | 'shipments'
  | 'trips'
  | 'invoices'
  | 'shops'
  | 'capital'
  | 'my-sales'
  | 'users';

interface NavItem {
  key: PageKey;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard className="w-5 h-5" /> },
  { key: 'inventory', label: 'المخزون', icon: <Package className="w-5 h-5" /> },
  { key: 'shipments', label: 'الشحنات', icon: <Ship className="w-5 h-5" />, adminOnly: true },
  { key: 'capital', label: 'رأس المال والمصروفات', icon: <WalletCards className="w-5 h-5" />, adminOnly: true },
  { key: 'trips', label: 'الجولات', icon: <Truck className="w-5 h-5" /> },
  { key: 'invoices', label: 'الفواتير', icon: <FileText className="w-5 h-5" /> },
  { key: 'shops', label: 'العملاء', icon: <Users className="w-5 h-5" /> },
  { key: 'my-sales', label: 'مبيعاتي', icon: <BarChart3 className="w-5 h-5" /> },
  { key: 'users', label: 'المستخدمون', icon: <UserCog className="w-5 h-5" />, adminOnly: true },
];

interface LayoutProps {
  current: PageKey;
  onNavigate: (p: PageKey) => void;
  children: ReactNode;
}

export function Layout({ current, onNavigate, children }: LayoutProps) {
  const { role, currentUser, data } = useApp();
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const isAdmin = role === 'admin';

  const pendingTripsCount = data.trips.filter((t) => t.status === 'pending_approval').length;

  const visibleItems = navItems.filter((i) => !i.adminOnly || isAdmin);
  const currentItem = navItems.find((i) => i.key === current);

  const totalDebts = data.shops.reduce((sum, s) => {
    const opening = s.openingBalance;
    const inv = data.invoices.filter((iv) => iv.shopId === s.id).reduce((a, b) => a + (b.total - b.paidAmount), 0);
    const pay = data.payments.filter((p) => p.shopId === s.id).reduce((a, b) => a + b.amount, 0);
    return sum + Math.max(0, opening + inv - pay);
  }, 0);

  return (
    <div className="min-h-screen bg-secondary-50 flex" style={{ direction: 'rtl' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-l border-secondary-100 sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-secondary-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-secondary-900 text-sm leading-tight">أبناء الحاتمي لقطع الغيار</p>
              <p className="text-xs text-secondary-400">نظام إدارة وتوزيع الجملة</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 scrollbar-thin">
          {visibleItems.map((item) => {
            const hasPendingBadge = item.key === 'trips' && pendingTripsCount > 0;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  current === item.key
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-secondary-600 hover:bg-secondary-50'
                }`}
              >
                <span className={current === item.key ? 'text-primary-600' : 'text-secondary-400'}>{item.icon}</span>
                <span className="flex-1 text-right">{item.label}</span>
                {hasPendingBadge && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-extrabold text-[11px] animate-pulse shadow-xs">
                    {pendingTripsCount} معلق
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-secondary-100 space-y-2">
          {isAdmin && (
            <button
              onClick={() => setBackupModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-bold transition-all border border-primary-200/60 shadow-xs"
            >
              <Database className="w-3.5 h-3.5" />
              نسخ احتياطي (JSON)
            </button>
          )}
          <div className="px-3 py-2.5 rounded-xl bg-secondary-50 flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isAdmin ? 'bg-primary-100 text-primary-700' : 'bg-success-100 text-success-700'
              }`}
            >
              {isAdmin ? <UserCog className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-secondary-800 truncate">{currentUser?.name || 'مستخدم'}</p>
              <p className="text-[10px] text-secondary-400">{isAdmin ? 'مدير النظام' : 'مندوب مبيعات'}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-secondary-50 hover:bg-error-50 hover:text-error-600 text-secondary-600 text-xs font-medium transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-secondary-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-secondary-900 text-sm leading-tight">أبناء الحاتمي لقطع الغيار</p>
              <p className="text-[10px] text-secondary-400">{isAdmin ? 'مدير النظام' : 'مندوب مبيعات'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && pendingTripsCount > 0 && (
              <button
                onClick={() => onNavigate('trips')}
                className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-xs flex items-center gap-1 animate-pulse"
                title="طلبات الجولات المعلقة"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{pendingTripsCount}</span>
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-secondary-100 px-6 py-3.5 items-center justify-between">
          <h1 className="text-lg font-bold text-secondary-900">{currentItem?.label}</h1>
          <div className="flex items-center gap-3">
            {isAdmin && pendingTripsCount > 0 && (
              <button
                onClick={() => onNavigate('trips')}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3.5 py-1.5 rounded-xl border border-amber-300 transition-all shadow-xs animate-pulse"
                title="يوجد طلبات جولات وبضاعة بانتظار موافقة الإدارة"
              >
                <Clock className="w-4 h-4 text-amber-700" />
                <span>يوجد {pendingTripsCount} طلب جولة معلق للموافقة</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setBackupModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-xl border border-primary-200/80 transition-all shadow-xs"
                title="تصدير أو استعادة نسخة احتياطية من قاعدة البيانات"
              >
                <Database className="w-3.5 h-3.5 text-primary-600" />
                <span>نسخ احتياطي (JSON)</span>
              </button>
            )}
            {isAdmin ? (
              <div className="flex items-center gap-1.5 text-sm text-secondary-500 bg-secondary-50 px-3 py-1.5 rounded-xl border border-secondary-100">
                <Users className="w-4 h-4 text-secondary-400" />
                <span className="text-secondary-500 text-xs">إجمالي الديون العامة:</span>
                <span className="font-bold text-error-600 tabular-nums">{totalDebts.toLocaleString('en-US')} د.ل</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-secondary-500 bg-success-50/70 px-3 py-1.5 rounded-xl border border-success-200/50">
                <UserCheck className="w-4 h-4 text-success-600" />
                <span className="text-success-800 text-xs font-semibold">مبيعاتي المحصلة:</span>
                <span className="font-bold text-success-700 tabular-nums">
                  {data.invoices
                    .filter((i) => i.createdBy === currentUser?.id)
                    .reduce((sum, i) => sum + i.paidAmount, 0)
                    .toLocaleString('en-US')}{' '}
                  د.ل
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-4 sm:px-6 lg:px-6 lg:py-6 pb-24 lg:pb-6 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-secondary-100 px-1 pb-[env(safe-area-inset-bottom)] shadow-lg">
        <div className="flex items-stretch justify-around">
          {visibleItems.slice(0, 5).map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-2 min-w-0 flex-1 transition-colors ${
                current === item.key ? 'text-primary-600' : 'text-secondary-400'
              }`}
            >
              <span className="relative">
                {item.icon}
                {item.key === 'trips' && pendingTripsCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-black text-[9px] animate-pulse">
                    {pendingTripsCount}
                  </span>
                )}
                {current === item.key && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-600" />
                )}
              </span>
              <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-secondary-950/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute top-0 inset-x-0 bg-white rounded-b-2xl shadow-xl p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-secondary-900">القائمة الرئيسية</h3>
              <button onClick={() => setMobileMenuOpen(false)} className="text-secondary-400 p-1">
                ✕
              </button>
            </div>
            <div className="px-3 py-3 rounded-xl bg-secondary-50 flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isAdmin ? 'bg-primary-100 text-primary-700' : 'bg-success-100 text-success-700'
                }`}
              >
                {isAdmin ? <UserCog className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-secondary-800">{currentUser?.name || 'مستخدم'}</p>
                <p className="text-xs text-secondary-400">{isAdmin ? 'مدير النظام' : 'مندوب مبيعات'}</p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setBackupModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 text-sm font-bold transition-all mb-3 border border-primary-200"
              >
                <Database className="w-4 h-4 text-primary-600" />
                نسخ احتياطي واستعادة (JSON)
              </button>
            )}
            <button
              onClick={() => {
                signOut();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-secondary-50 hover:bg-error-50 hover:text-error-600 text-secondary-600 text-sm font-medium transition-all mb-4"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
            <div className="grid grid-cols-2 gap-2">
              {visibleItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    onNavigate(item.key);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    current === item.key
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-secondary-600 hover:bg-secondary-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.key === 'trips' && pendingTripsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-xs">
                      {pendingTripsCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Backup & Restore Database Modal */}
      {isAdmin && (
        <BackupRestoreModal
          open={backupModalOpen}
          onClose={() => setBackupModalOpen(false)}
        />
      )}
    </div>
  );
}
