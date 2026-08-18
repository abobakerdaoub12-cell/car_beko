import { useMemo, useState } from 'react';
import {
  Wallet, TrendingUp, DollarSign, AlertCircle, Package, FileText, Users, Ship,
  ArrowLeft, MapPin, Truck, Award, ShoppingCart, CheckCircle2, Coins, RotateCcw, Trash2, Database, Download, ShieldCheck,
  WalletCards, TrendingDown, ArrowUpRight, ArrowDownRight, PlusCircle, Wrench, Clock, XCircle, ChevronRight, Boxes
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button, Input } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { BackupRestoreModal } from '@/components/BackupRestoreModal';
import { formatAed, formatDate } from '@/lib/format';
import { cityLabel } from '@/lib/geo';
import { cleanPersonName } from '@/components/PrintInvoiceModal';
import type { PageKey } from '@/components/Layout';

export function Dashboard({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const {
    role,
    currentUser,
    data,
    totalOutstanding,
    debtsByCity,
    totalCapital,
    totalExpenses,
    remainingCapital,
    clearSalesAndTransactions,
    clearAllSystemData,
    approveTrip,
    rejectTrip
  } = useApp();
  const isAdmin = role === 'admin';
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [approvingTripId, setApprovingTripId] = useState<string | null>(null);
  const [rejectingTripId, setRejectingTripId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const capTotal = totalCapital();
  const expTotal = totalExpenses();
  const remCap = remainingCapital();

  // Pending trips for Admin approval
  const pendingTrips = useMemo(
    () => data.trips.filter((t) => t.status === 'pending_approval'),
    [data.trips]
  );

  const handleApprove = async (tripId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await approveTrip(tripId);
      setApprovingTripId(null);
    } catch (e: any) {
      setActionError(e?.message || 'فشل اعتماد وصرف الجولة');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (tripId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await rejectTrip(tripId, rejectReason);
      setRejectingTripId(null);
      setRejectReason('');
    } catch (e: any) {
      setActionError(e?.message || 'فشل رفض الطلب');
    } finally {
      setActionLoading(false);
    }
  };

  // For sales rep: show only their own invoices and stats
  const userInvoices = useMemo(
    () => (isAdmin ? data.invoices : data.invoices.filter((i) => i.createdBy === currentUser.id)),
    [data.invoices, currentUser.id, isAdmin]
  );

  const totalRevenue = userInvoices.reduce((s, i) => s + i.total, 0);
  const totalCollected = userInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalCost = userInvoices.reduce((s, i) => s + i.totalCost, 0);
  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const myUnpaid = userInvoices.reduce((s, i) => s + (i.total - i.paidAmount), 0);

  // Recent capital transactions (for dashboard overview)
  const recentCapitalTxs = useMemo(() => {
    const list = [...(data.capitalTransactions || [])];
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);
  }, [data.capitalTransactions]);

  // My active trip if any
  const myActiveTrip = useMemo(
    () => data.trips.find((t) => (t.createdBy === currentUser.id || t.driverName.toLowerCase().includes(currentUser.name.toLowerCase()) || t.createdByName === currentUser.name) && t.status === 'active') ||
          data.trips.find((t) => (t.createdBy === currentUser.id || t.driverName.toLowerCase().includes(currentUser.name.toLowerCase()) || t.createdByName === currentUser.name) && t.status === 'loading'),
    [data.trips, currentUser.id, currentUser.name]
  );

  const myPendingTrip = useMemo(
    () => data.trips.find((t) => (t.createdBy === currentUser.id || t.driverName.toLowerCase().includes(currentUser.name.toLowerCase()) || t.createdByName === currentUser.name) && t.status === 'pending_approval'),
    [data.trips, currentUser.id, currentUser.name]
  );

  const totalMyTripUnits = myActiveTrip?.items?.reduce((sum, item) => sum + Math.max(0, item.loadedQty - item.soldQty), 0) || 0;

  const lowStockItems = data.inventory.filter((i) => i.stock <= i.minStock);
  const inventoryValue = data.inventory.reduce((s, i) => s + i.stock * i.purchasePrice, 0);
  const totalStockUnits = data.inventory.reduce((s, i) => s + i.stock, 0);
  const inTransit = data.shipments.filter((s) => s.status === 'in_transit').length;

  const recentInvoices = userInvoices.slice(0, 5);
  const cityDebts = debtsByCity();

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-l from-primary-700 via-primary-800 to-primary-900 text-white p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-primary-200 text-xs font-semibold">
              {isAdmin ? 'نظام إدارة مبيعات وتوزيع قطع غيار السيارات' : 'بوابة المندوب الميداني'}
            </p>
            <h2 className="text-xl sm:text-2xl font-black mt-1">
              {isAdmin ? 'مرحباً بك في لوحة تحكم ' : `أهلاً بك، ${currentUser.name}`}
            </h2>
            <p className="text-primary-100 text-sm mt-1 max-w-md">
              {isAdmin
                ? 'نظرة شاملة على مبيعات الجملة، ديون العملاء، وحركة المخزون  .'
                : 'تابع مبيعاتك الشخصية، تحصيلاتك النقدية والبنكية، وبضاعة سيارتك الحالية.'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {isAdmin && (
              <button
                onClick={() => setBackupModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-primary-600/90 hover:bg-primary-600 text-white font-bold text-xs border border-primary-400/40 transition-all flex items-center gap-1.5 shadow-sm"
                title="تصدير أو استعادة نسخة احتياطية من قاعدة البيانات"
              >
                <Database className="w-3.5 h-3.5" />
                نسخ احتياطي 
              </button>
            )}
            {isAdmin && (userInvoices.length > 0 || data.payments.length > 0) && (
              <button
                onClick={() => setResetModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-error-600/80 hover:bg-error-600 text-white font-semibold text-xs border border-error-400/30 transition-all flex items-center gap-1.5 shadow-sm"
                title="تصفير أرقام المبيعات والفواتير والتحصيلات"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                تصفير المبيعات
              </button>
            )}
            <button
              onClick={() => onNavigate('invoices')}
              className="px-4 py-2.5 rounded-xl bg-white text-primary-800 hover:bg-primary-50 font-bold text-sm shadow-sm transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              فاتورة جديدة
            </button>
            <button
              onClick={() => onNavigate('inventory')}
              className="px-4 py-2.5 rounded-xl bg-primary-600/60 hover:bg-primary-600 text-white font-semibold text-sm border border-primary-400/30 transition-all flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              المخزون
            </button>
          </div>
        </div>
      </div>

      {/* Admin Pending Trip Requests Section */}
      {isAdmin && pendingTrips.length > 0 && (
        <div className="rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 p-5 shadow-sm space-y-3.5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-amber-950 text-base flex items-center gap-2">
                  <span>طلبات الجولات وبضاعة المخزن المعلقة</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-black text-xs">
                    {pendingTrips.length} {pendingTrips.length === 1 ? 'طلب' : 'طلبات'}
                  </span>
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  قام مندوب المبيعات بطلب جولة وتحديد قطع الغيار من المخزن. اضغط للموافقة وصرف البضاعة فورياً للسيارة.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('trips')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
            >
              <span>إدارة كافة الجولات</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingTrips.map((trip) => {
              const totalUnits = trip.items.reduce((s, it) => s + it.loadedQty, 0);
              const totalValue = trip.items.reduce((s, it) => s + it.loadedQty * it.unitPrice, 0);

              return (
                <div
                  key={trip.id}
                  className="bg-white rounded-xl ring-1 ring-amber-300 p-4 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-secondary-900 text-sm">{trip.driverName}</span>
                          {trip.createdByName && trip.createdByName !== trip.driverName && (
                            <span className="text-xs text-secondary-500">({trip.createdByName})</span>
                          )}
                        </div>
                        <p className="text-xs text-primary-700 font-semibold mt-0.5 flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" />
                          {trip.vehicle || 'سيارة غير محددة'} • {trip.city || 'المدينة عامة'}{trip.area ? ` - ${trip.area}` : ''}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        بانتظار موافقتك
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-secondary-500">
                      <span>تاريخ المغادرة: <strong>{formatDate(trip.departureAt)}</strong></span>
                      <span>•</span>
                      <span>القطع: <strong className="text-primary-700">{trip.items.length} صنف ({totalUnits} وحدة)</strong></span>
                    </div>

                    {/* Preview of requested items */}
                    <div className="bg-secondary-50 rounded-lg p-2 max-h-28 overflow-y-auto divide-y divide-secondary-100 text-xs">
                      {trip.items.map((it) => (
                        <div key={it.id} className="py-1 flex items-center justify-between text-[11px]">
                          <span className="text-secondary-800 font-medium truncate max-w-[190px]">{it.description}</span>
                          <span className="font-bold text-primary-700 shrink-0">{it.loadedQty} وحدة</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-secondary-100 flex items-center justify-between gap-2">
                    <span className="text-xs text-secondary-500 font-medium">
                      القيمة: <strong className="text-success-600 font-bold">{formatAed(totalValue)}</strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setApprovingTripId(trip.id)}
                        className="px-3 py-1.5 rounded-xl bg-success-600 hover:bg-success-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>موافقة وصرف</span>
                      </button>
                      <button
                        onClick={() => setRejectingTripId(trip.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-error-50 hover:bg-error-100 text-error-700 text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>رفض</span>
                      </button>
                      <button
                        onClick={() => onNavigate('trips')}
                        className="p-1.5 rounded-xl bg-secondary-100 hover:bg-secondary-200 text-secondary-600 text-xs transition-all"
                        title="عرض كامل في صفحة الجولات"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sales Rep Pending Trip Notification */}
      {!isAdmin && myPendingTrip && (
        <div className="rounded-2xl bg-amber-50 border border-amber-300 p-4 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">
                طلب جولتك وبضاعة السيارة قيد مراجعة الإدارة ({myPendingTrip.items.reduce((s, it) => s + it.loadedQty, 0)} قطعة مطلوبة)
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                وجهة الجولة: {myPendingTrip.city} - {myPendingTrip.area || 'عامة'} • السيارة: {myPendingTrip.vehicle || 'غير محدد'} • سيتم إشعارك فور اعتماد الإدارة لصرف البضاعة.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('trips')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shrink-0 shadow-xs"
          >
            معاينة طلب الجولة
          </button>
        </div>
      )}

      {/* Capital & Expenses Core Metrics (Explicit requirement) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl p-5 border border-secondary-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-secondary-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
                <WalletCards className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-secondary-900 text-sm sm:text-base leading-tight">
                  المركز المالي: رأس المال والمصروفات
                </h3>
                <p className="text-xs text-secondary-500">
                  رأس المال المتبقي = إجمالي رأس المال + إضافات رأس المال - إجمالي المصروفات
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => onNavigate('capital')}
                className="px-3 py-1.5 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-primary-200"
              >
                <span>سجل رأس المال والمصروفات</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Total Capital */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-blue-900">إجمالي رأس المال</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-extrabold">
                    أساسي + إضافات
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-black text-blue-900 mt-1 font-mono tracking-tight">
                  {formatAed(capTotal)}
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  قيمة أساسية لا تتغير عند المصروفات
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5" />
              </div>
            </div>

            {/* Total Expenses */}
            <div className="p-4 rounded-xl bg-error-50/50 border border-error-100/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-error-900">إجمالي المصروفات</span>
                  <span className="px-1.5 py-0.5 rounded bg-error-100 text-error-800 text-[10px] font-extrabold">
                    صيانة وتشغيل
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-black text-error-600 mt-1 font-mono tracking-tight">
                  {formatAed(expTotal)}
                </p>
                <p className="text-[11px] text-error-700 mt-0.5">
                  {data.capitalTransactions?.filter((t) => t.type === 'expense').length || 0} مصروف مسجل
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-error-100 text-error-700 flex items-center justify-center shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            {/* Remaining Capital */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                remCap >= 0
                  ? 'bg-emerald-50/50 border-emerald-100/80 text-emerald-900'
                  : 'bg-error-50/50 border-error-200 text-error-900'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold">رأس المال المتبقي</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                      remCap >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-error-100 text-error-800'
                    }`}
                  >
                    الرصيد الفعلي
                  </span>
                </div>
                <p
                  className={`text-xl sm:text-2xl font-black mt-1 font-mono tracking-tight ${
                    remCap >= 0 ? 'text-emerald-700' : 'text-error-700'
                  }`}
                >
                  {formatAed(remCap)}
                </p>
                <p className="text-[11px] text-secondary-500 mt-0.5">
                  يُخصم منه تلقائياً أي مصروف
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  remCap >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-error-100 text-error-700'
                }`}
              >
                <WalletCards className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top metric cards */}
      <div className={`grid grid-cols-2 ${isAdmin ? 'sm:grid-cols-3 lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3 sm:gap-4`}>
        <StatCard
          label={isAdmin ? 'إجمالي مبيعات ' : 'إجمالي مبيعاتي'}
          value={formatAed(totalRevenue)}
          icon={<TrendingUp className="w-5 h-5" />}
          tone="primary"
          sub={`${userInvoices.length} فاتورة مسجلة`}
        />
        {isAdmin && (
          <StatCard
            label="رأس المال (تكلفة المبيعات)"
            value={formatAed(totalCost)}
            icon={<Coins className="w-5 h-5" />}
            tone="secondary"
            sub={`رأس مال المخزون: ${formatAed(inventoryValue)}`}
          />
        )}
        <StatCard
          label={isAdmin ? 'المبالغ المحصل' : 'المبالغ المحصلة بعهدتي'}
          value={formatAed(totalCollected)}
          icon={<DollarSign className="w-5 h-5" />}
          tone="success"
          sub={`نسبة التحصيل: ${totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0}%`}
        />
        <StatCard
          label={isAdmin ? 'إجمالي الديون ' : 'الآجل المتبقي على فواتيري'}
          value={isAdmin ? formatAed(totalOutstanding()) : formatAed(myUnpaid)}
          icon={<Wallet className="w-5 h-5" />}
          tone={isAdmin ? 'error' : 'warning'}
          sub={isAdmin ? `على ${data.shops.length} عميل ومحل` : 'مستحقات مؤجلة قيد التحصيل'}
        />
        {isAdmin ? (
          <StatCard
            label="صافي الأرباح المقدر"
            value={formatAed(totalProfit)}
            icon={<TrendingUp className="w-5 h-5" />}
            tone="accent"
            sub={`هامش ربح ${profitMargin.toFixed(1)}%`}
          />
        ) : (
          <StatCard
            label="حالة الجولة والسيارة"
            value={
              myActiveTrip
                ? `${totalMyTripUnits} قطعة`
                : myPendingTrip
                ? '⏳ قيد الموافقة'
                : 'لا توجد جولة'
            }
            icon={<Truck className="w-5 h-5" />}
            tone={myActiveTrip ? 'primary' : myPendingTrip ? 'warning' : 'secondary'}
            sub={
              myActiveTrip
                ? `سيارة: ${myActiveTrip.city || myActiveTrip.vehicle}`
                : myPendingTrip
                ? `طلب (${myPendingTrip.items.reduce((s, it) => s + it.loadedQty, 0)} قطعة) بانتظار الإدارة`
                : 'اضغط لطلب جولة وبضاعة جديدة'
            }
          />
        )}
      </div>

      {/* Second row stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl ring-1 ring-secondary-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-secondary-400 font-medium">عدد أصناف المخزون</p>
            <p className="text-lg font-bold text-secondary-900 mt-0.5">{data.inventory.length} صنف</p>
            <p className="text-[11px] text-secondary-400">{totalStockUnits.toLocaleString('en-US')} قطعة متوفرة</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-secondary-100 flex items-center justify-center text-secondary-600">
            <Package className="w-4 h-4" />
          </div>
        </div>

        {isAdmin ? (
          <div className="bg-white p-4 rounded-2xl ring-1 ring-secondary-100 shadow-md flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary-400 font-medium">قيمة المخزون (شراء)</p>
              <p className="text-lg font-bold text-secondary-900 mt-0.5">{formatAed(inventoryValue)}</p>
              <p className="text-[11px] text-secondary-400">بسعر التكلفة</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl ring-1 ring-secondary-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary-400 font-medium">قطع بضاعتي المباعة</p>
              <p className="text-lg font-bold text-secondary-900 mt-0.5">
                {userInvoices.reduce((sum, inv) => sum + inv.lines.reduce((a, l) => a + l.qty, 0), 0)} قطعة
              </p>
              <p className="text-[11px] text-secondary-400">إجمالي قطع فواتيري</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-success-50 flex items-center justify-center text-success-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-2xl ring-1 ring-secondary-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-secondary-400 font-medium">تنبيهات نقص المخزون</p>
            <p className={`text-lg font-bold mt-0.5 ${lowStockItems.length > 0 ? 'text-warning-600' : 'text-success-600'}`}>
              {lowStockItems.length} صنف
            </p>
            <p className="text-[11px] text-secondary-400">وصلت للحد الأدنى</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-warning-50 flex items-center justify-center text-warning-600">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl ring-1 ring-secondary-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-secondary-400 font-medium">دليل العملاء والمحلات</p>
            <p className="text-lg font-bold text-secondary-900 mt-0.5">{data.shops.length} محل</p>
            <p className="text-[11px] text-secondary-400">في مدن ومناطق مختلفة</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-success-50 flex items-center justify-center text-success-600">
            <Users className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Grid: Recent invoices & City debts (or Trip Summary for sales rep) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent invoices */}
        <div className="lg:col-span-2 bg-white rounded-2xl ring-1 ring-secondary-100 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-secondary-900">
                {isAdmin ? 'آخر الفواتير الصادرة' : 'آخر فواتيري الشخصية'}
              </h3>
              <p className="text-xs text-secondary-400">
                {isAdmin ? 'أحدث عمليات البيع وتفاصيل السداد لجميع المناديب' : 'أحدث فواتير البيع المسجلة باسمك'}
              </p>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              عرض الكل
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="py-8 text-center text-sm text-secondary-400">لا توجد فواتير مسجلة بعد</div>
          ) : (
            <div className="divide-y divide-secondary-100">
              {recentInvoices.map((inv) => {
                const remaining = inv.total - inv.paidAmount;
                const statusTone = inv.status === 'paid' ? 'success' : inv.status === 'partial' ? 'warning' : 'error';
                const statusLabel = inv.status === 'paid' ? 'مدفوعة' : inv.status === 'partial' ? 'دفعة جزئية' : 'غير مدفوعة';

                return (
                  <div key={inv.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-secondary-900 truncate">{inv.shopName}</span>
                        <Badge tone={statusTone}>{statusLabel}</Badge>
                      </div>
                      <p className="text-xs text-secondary-400 mt-0.5">
                        رقم {inv.number} • {formatDate(inv.date)} {isAdmin && `• بواسطة ${cleanPersonName(inv.createdByName) || 'أبوبكر دعوب'}`}
                      </p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="font-bold text-secondary-900 tabular-nums">{formatAed(inv.total)}</p>
                      {remaining > 0 && (
                        <p className="text-xs text-error-600 font-medium tabular-nums">متبقي: {formatAed(remaining)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Debts by city (Admin only) or Active Trip breakdown (Sales rep) */}
        {isAdmin ? (
          <div className="bg-white rounded-2xl ring-1 ring-secondary-100 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-secondary-900">توزيع الديون بالمدن</h3>
                <p className="text-xs text-secondary-400">أعلى المدن في مبالغ الذمم</p>
              </div>
              <button
                onClick={() => onNavigate('shops')}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                العملاء
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {cityDebts.length === 0 ? (
              <div className="py-8 text-center text-sm text-secondary-400">لا توجد ديون مستحقة</div>
            ) : (
              <div className="space-y-3">
                {cityDebts.slice(0, 6).map((c) => {
                  const totalD = totalOutstanding() || 1;
                  const pct = Math.min(100, Math.round((c.debt / totalD) * 100));

                  return (
                    <div key={c.city} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-secondary-800 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-secondary-400" />
                          {cityLabel(c.city)}
                          <span className="text-[10px] text-secondary-400">({c.shopCount} محل)</span>
                        </span>
                        <span className="font-bold text-secondary-900 tabular-nums">{formatAed(c.debt)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl ring-1 ring-secondary-100 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-secondary-900">بضاعة سيارة التوزيع</h3>
                <p className="text-xs text-secondary-400">
                  {myActiveTrip ? `جولة: ${myActiveTrip.city}` : 'لا توجد جولة محملة حالياً'}
                </p>
              </div>
              <button
                onClick={() => onNavigate('trips')}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                الجولات
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {myActiveTrip && myActiveTrip.items.length > 0 ? (
              <div className="space-y-2.5 max-h-64 overflow-y-auto scrollbar-thin">
                {myActiveTrip.items.slice(0, 5).map((item) => (
                  <div key={item.itemId} className="p-2.5 rounded-xl bg-secondary-50 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-secondary-900 truncate">{item.description}</p>
                      <p className="text-[10px] font-mono text-secondary-400">{item.oem}</p>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-primary-100 text-primary-800 font-bold tabular-nums">
                      {Math.max(0, item.loadedQty - item.soldQty)} متبقي
                    </span>
                  </div>
                ))}
                {myActiveTrip.items.length > 5 && (
                  <p className="text-[11px] text-center text-secondary-400 pt-1">
                    و {myActiveTrip.items.length - 5} صنف آخر بالسيارة
                  </p>
                )}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Truck className="w-8 h-8 text-secondary-300 mx-auto" />
                <p className="text-xs text-secondary-500">لا توجد بضاعة محملة بالسيارة حالياً</p>
                <button
                  onClick={() => onNavigate('trips')}
                  className="text-xs font-bold text-primary-600 hover:underline"
                >
                  فتح قسم الجولات الميدانية
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Capital Transactions Ledger Widget (Admin only) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl ring-1 ring-secondary-100 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-secondary-100">
            <div>
              <h3 className="font-bold text-secondary-900 flex items-center gap-2">
                <WalletCards className="w-5 h-5 text-primary-600" />
                آخر حركات رأس المال والمصروفات
              </h3>
              <p className="text-xs text-secondary-400 mt-0.5">
                سجل العمليات مع بيان الرصيد قبل وبعد وإجمالي رأس المال
              </p>
            </div>
            <button
              onClick={() => onNavigate('capital')}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              عرض السجل الكامل
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentCapitalTxs.length === 0 ? (
            <div className="py-6 text-center text-sm text-secondary-400">
              لا توجد حركات رأس مال أو مصروفات مسجلة بعد
            </div>
          ) : (
            <div className="divide-y divide-secondary-100">
              {recentCapitalTxs.map((tx) => {
                const isExp = tx.type === 'expense';
                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            isExp ? 'bg-error-50 text-error-700' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isExp ? 'مصروف' : 'إيداع رأس مال'}
                        </span>
                        <span className="font-bold text-secondary-900 truncate">{tx.description}</span>
                        {tx.vehicleName && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded font-semibold">
                            {tx.vehicleName}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-secondary-400 mt-0.5 font-mono">
                        {formatDate(tx.date)} • الرصيد بعد: {formatAed(tx.balanceAfter)}
                      </p>
                    </div>
                    <div className="text-left shrink-0 font-mono font-bold">
                      <span className={isExp ? 'text-error-600' : 'text-emerald-600'}>
                        {isExp ? '-' : '+'} {formatAed(tx.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Admin Quick Backup & Data Safety Card */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-100/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-secondary-900 text-sm flex items-center gap-1.5">
                حماية البيانات والنسخ الاحتياطي الدوري (JSON)
                <ShieldCheck className="w-4 h-4 text-success-600" />
              </h4>
              <p className="text-xs text-secondary-500 mt-0.5 leading-relaxed">
                قم بتنزيل ملف نسخة احتياطية محلية بصيغة JSON بضغطة زر لضمان عدم ضياع فواتيرك وحساباتك وإمكانية استعادتها بأمان في أي وقت.
              </p>
            </div>
          </div>
          <button
            onClick={() => setBackupModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-primary-50 text-primary-700 font-bold text-xs border border-primary-200 shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4 text-primary-600" />
            إدارة وتصدير النسخ الاحتياطية
          </button>
        </div>
      )}

      {/* Backup & Restore Database Modal */}
      {isAdmin && (
        <BackupRestoreModal
          open={backupModalOpen}
          onClose={() => setBackupModalOpen(false)}
        />
      )}

      {/* Reset Confirmation Modal */}
      {resetModalOpen && (
        <Modal
          open={resetModalOpen}
          onClose={() => !isResetting && setResetModalOpen(false)}
          title="تصفير وتفريغ بيانات المبيعات التجريبية"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" disabled={isResetting} onClick={() => setResetModalOpen(false)}>إلغاء</Button>
              <Button
                variant="danger"
                disabled={isResetting}
                onClick={async () => {
                  setIsResetting(true);
                  try {
                    await clearSalesAndTransactions();
                    setResetModalOpen(false);
                  } finally {
                    setIsResetting(false);
                  }
                }}
              >
                {isResetting ? 'جاري التصفير...' : 'نعم، تصفير كافة المبيعات والفواتير'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-secondary-800 font-semibold">
              هل أنت متأكد من رغبتك في تصفير كافة سجلات المبيعات، الفواتير، وسندات التحصيل التجريبية؟
            </p>
            <div className="p-3 rounded-xl bg-error-50 border border-error-100 text-xs text-error-700 space-y-1">
              <p className="font-bold">• ستصبح إجمالي المبيعات = 0 د.ل</p>
              <p className="font-bold">• ستصبح المبالغ المحصلة = 0 د.ل</p>
              <p className="font-bold">• سيتم تصفير كافة الفواتير والديون لتتمكن من بدء العمل الفعلي.</p>
            </div>
          </div>
        </Modal>
      )}
      {/* Admin Approval Confirmation Modal */}
      {approvingTripId && (() => {
        const tripToApprove = data.trips.find((t) => t.id === approvingTripId);
        if (!tripToApprove) return null;
        const totalItemsCount = tripToApprove.items.reduce((s, i) => s + i.loadedQty, 0);

        return (
          <Modal
            open
            onClose={() => !actionLoading && setApprovingTripId(null)}
            title="موافقة واعتماد الجولة وصرف البضاعة"
            size="md"
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" fullWidth disabled={actionLoading} onClick={() => setApprovingTripId(null)}>
                  إلغاء
                </Button>
                <Button
                  fullWidth
                  disabled={actionLoading}
                  onClick={() => handleApprove(approvingTripId)}
                  className="bg-success-600 hover:bg-success-700 text-white"
                >
                  {actionLoading ? 'جاري الصرف والاعتماد...' : 'تأكيد الموافقة وصرف البضاعة'}
                </Button>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-success-50 border border-success-200 text-success-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-success-600" />
                  اعتماد طلب الجولة للمندوب: {tripToApprove.driverName}
                </p>
                <p className="text-success-700">
                  عند التأكيد، سيتم خصم قطع الغيار المطلوبة ({totalItemsCount} وحدة) من رصيد المخزن الرئيسي وتحويل حالة الجولة إلى 🟢 "جارية" ليتمكن المندوب من البيع وإصدار الفواتير.
                </p>
              </div>

              {actionError && (
                <div className="p-3 rounded-xl bg-error-50 border border-error-200 text-error-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="max-h-56 overflow-y-auto rounded-xl ring-1 ring-secondary-100 p-2 divide-y divide-secondary-50">
                <p className="text-xs font-bold text-secondary-600 px-2 py-1">القطع المطلوب صرفها من المخزن:</p>
                {tripToApprove.items.map((it) => {
                  const inv = data.inventory.find((i) => i.id === it.itemId);
                  const isStockShort = inv ? inv.stock < it.loadedQty : false;

                  return (
                    <div key={it.id} className="py-2 px-2 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-secondary-800">{it.description}</p>
                        <p className="text-[11px] font-mono text-secondary-400">{it.oem}</p>
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-primary-700">{it.loadedQty} وحدة</span>
                        {inv && (
                          <p className={`text-[10px] ${isStockShort ? 'text-error-600 font-bold' : 'text-secondary-400'}`}>
                            المتوفر بالمخزن: {inv.stock}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Admin Reject Confirmation Modal */}
      {rejectingTripId && (() => {
        const tripToReject = data.trips.find((t) => t.id === rejectingTripId);
        if (!tripToReject) return null;

        return (
          <Modal
            open
            onClose={() => !actionLoading && setRejectingTripId(null)}
            title="رفض طلب الجولة"
            size="sm"
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" fullWidth disabled={actionLoading} onClick={() => setRejectingTripId(null)}>
                  إلغاء
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  disabled={actionLoading}
                  onClick={() => handleReject(rejectingTripId)}
                >
                  {actionLoading ? 'جاري الرفض...' : 'تأكيد الرفض'}
                </Button>
              </div>
            }
          >
            <div className="space-y-3">
              <p className="text-sm text-secondary-600">
                هل أنت متأكد من رفض طلب الجولة المقدم من <strong className="text-secondary-900">{tripToReject.driverName}</strong>؟
              </p>
              <Input
                label="سبب الرفض (اختياري للمندوب)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="مثال: البضاعة محجوزة لطلبية أخرى / تعديل كميات..."
              />
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

