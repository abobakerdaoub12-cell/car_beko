import { useState, useMemo } from 'react';
import {
  WalletCards,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Truck,
  Building2,
  Users,
  Fuel,
  Wrench,
  Zap,
  Package,
  Coffee,
  Search,
  Filter,
  Calendar,
  Trash2,
  Edit2,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Receipt,
  Car,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatAed, formatDate } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import type { CapitalTransaction } from '@/types';

type FilterType = 'all' | 'capital' | 'expense';

const EXPENSE_CATEGORIES = [
  { id: 'maintenance', label: 'صيانة وإصلاح سيارات', icon: Wrench, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'fuel', label: 'وقود وبنزين', icon: Fuel, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'rent', label: 'إيجار مقر / مخزن', icon: Building2, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'salaries', label: 'رواتب ومستحقات', icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'shipping', label: 'شحن ونقل لوجستي', icon: Package, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'utilities', label: 'كهرباء ومياه ومرافق', icon: Zap, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { id: 'hospitality', label: 'ضيافة ومصروفات إدارية', icon: Coffee, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'other', label: 'مصروفات أخرى متنوعة', icon: Receipt, color: 'text-secondary-600 bg-secondary-50 border-secondary-200' },
];

export function Capital() {
  const {
    data,
    totalCapital,
    totalExpenses,
    remainingCapital,
    addCapitalTransaction,
    updateCapitalTransaction,
    deleteCapitalTransaction,
  } = useApp();

  // Modals state
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<CapitalTransaction | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_30_days'>('all');

  // Form states for Capital Modal
  const [capitalType, setCapitalType] = useState<'capital_initial' | 'capital_injection'>('capital_injection');
  const [capitalAmount, setCapitalAmount] = useState('');
  const [capitalDate, setCapitalDate] = useState(new Date().toISOString().slice(0, 10));
  const [capitalDescription, setCapitalDescription] = useState('');

  // Form states for Expense Modal
  const [expenseCategory, setExpenseCategory] = useState('maintenance');
  const [expenseVehicleId, setExpenseVehicleId] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseDescription, setExpenseDescription] = useState('');

  const currentTotalCap = totalCapital();
  const currentTotalExp = totalExpenses();
  const currentRemaining = remainingCapital();

  // Transactions list sorted latest first for display
  const transactions = useMemo(() => {
    const list = [...(data.capitalTransactions || [])];
    return list.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [data.capitalTransactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (filterType === 'capital' && tx.type === 'expense') return false;
      if (filterType === 'expense' && tx.type !== 'expense') return false;

      // Category filter
      if (filterCategory !== 'all' && tx.category !== filterCategory) return false;

      // Vehicle filter
      if (filterVehicle !== 'all' && tx.vehicleId !== filterVehicle) return false;

      // Date filter
      if (dateFilter === 'this_month') {
        const txDate = new Date(tx.date);
        const now = new Date();
        if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (dateFilter === 'last_30_days') {
        const txTime = new Date(tx.date).getTime();
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        if (txTime < thirtyDaysAgo) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const descMatch = (tx.description || '').toLowerCase().includes(term);
        const userMatch = (tx.createdByName || '').toLowerCase().includes(term);
        const vehicleMatch = (tx.vehicleName || '').toLowerCase().includes(term);
        const catMatch = (tx.category || '').toLowerCase().includes(term);
        if (!descMatch && !userMatch && !vehicleMatch && !catMatch) return false;
      }

      return true;
    });
  }, [transactions, filterType, filterCategory, filterVehicle, dateFilter, searchTerm]);

  // Vehicle expenses breakdown
  const vehicleExpensesSummary = useMemo(() => {
    const map = new Map<string, { vehicleName: string; count: number; total: number }>();
    (data.capitalTransactions || []).forEach((tx) => {
      if (tx.type === 'expense' && tx.vehicleId) {
        const v = data.vehicles.find((veh) => veh.id === tx.vehicleId);
        const name = tx.vehicleName || v?.name || 'مركبة غير محددة';
        const ex = map.get(tx.vehicleId) || { vehicleName: name, count: 0, total: 0 };
        ex.count += 1;
        ex.total += Number(tx.amount || 0);
        map.set(tx.vehicleId, ex);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [data.capitalTransactions, data.vehicles]);

  // Category breakdown
  const categorySummary = useMemo(() => {
    const map = new Map<string, number>();
    (data.capitalTransactions || []).forEach((tx) => {
      if (tx.type === 'expense') {
        const cat = tx.category || 'other';
        map.set(cat, (map.get(cat) || 0) + Number(tx.amount || 0));
      }
    });
    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const def = EXPENSE_CATEGORIES.find((c) => c.id === catId);
        return {
          id: catId,
          label: def?.label || 'أخرى',
          amount,
          percentage: currentTotalExp > 0 ? (amount / currentTotalExp) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [data.capitalTransactions, currentTotalExp]);

  // Submit Capital Transaction
  const handleSaveCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(capitalAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    if (editingTx) {
      await updateCapitalTransaction(editingTx.id, {
        amount: amountNum,
        date: capitalDate,
        description: capitalDescription.trim() || (capitalType === 'capital_initial' ? 'رأس مال تأسيسي' : 'ضخ رأس مال إضافي'),
      });
      setEditingTx(null);
    } else {
      await addCapitalTransaction({
        type: capitalType,
        category: 'capital',
        amount: amountNum,
        date: capitalDate,
        description: capitalDescription.trim() || (capitalType === 'capital_initial' ? 'رأس مال تأسيسي للمشروع' : 'إضافة رأس مال للمشروع'),
      });
    }

    setIsCapitalModalOpen(false);
    setCapitalAmount('');
    setCapitalDescription('');
  };

  // Submit Expense Transaction
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const selectedVehicle = data.vehicles.find((v) => v.id === expenseVehicleId);
    const vehicleName = selectedVehicle ? `${selectedVehicle.name} (${selectedVehicle.plateNumber})` : undefined;

    const catDef = EXPENSE_CATEGORIES.find((c) => c.id === expenseCategory);
    const defaultDesc = catDef ? `مصروف ${catDef.label}` : 'مصروف تشغيلي';

    if (editingTx) {
      await updateCapitalTransaction(editingTx.id, {
        category: expenseCategory,
        amount: amountNum,
        date: expenseDate,
        description: expenseDescription.trim() || defaultDesc,
        vehicleId: expenseVehicleId || undefined,
        vehicleName,
      });
      setEditingTx(null);
    } else {
      await addCapitalTransaction({
        type: 'expense',
        category: expenseCategory,
        amount: amountNum,
        date: expenseDate,
        description: expenseDescription.trim() || defaultDesc,
        vehicleId: expenseVehicleId || undefined,
        vehicleName,
      });
    }

    setIsExpenseModalOpen(false);
    setExpenseAmount('');
    setExpenseDescription('');
    setExpenseVehicleId('');
  };

  const handleEdit = (tx: CapitalTransaction) => {
    setEditingTx(tx);
    if (tx.type === 'expense') {
      setExpenseCategory(tx.category || 'maintenance');
      setExpenseVehicleId(tx.vehicleId || '');
      setExpenseAmount(tx.amount.toString());
      setExpenseDate(tx.date);
      setExpenseDescription(tx.description);
      setIsExpenseModalOpen(true);
    } else {
      setCapitalType(tx.type as 'capital_initial' | 'capital_injection');
      setCapitalAmount(tx.amount.toString());
      setCapitalDate(tx.date);
      setCapitalDescription(tx.description);
      setIsCapitalModalOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCapitalTransaction(id);
    setDeleteConfirmId(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto" id="capital-page-root">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-secondary-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 border border-primary-100">
            <WalletCards className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 leading-tight">
              إدارة رأس المال والمصروفات
            </h1>
            <p className="text-xs sm:text-sm text-secondary-500 mt-0.5">
              تتبع إجمالي رأس المال، إضافات رأس المال، والمصروفات التشغيلية وصيانة الأسطول بدقة تامة
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setEditingTx(null);
              setCapitalAmount('');
              setCapitalDescription('');
              setCapitalDate(new Date().toISOString().slice(0, 10));
              setCapitalType(data.capitalTransactions?.length === 0 ? 'capital_initial' : 'capital_injection');
              setIsCapitalModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-xs sm:text-sm transition-all shadow-xs"
            id="btn-add-capital"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة رأس مال</span>
          </button>

          <button
            onClick={() => {
              setEditingTx(null);
              setExpenseAmount('');
              setExpenseDescription('');
              setExpenseVehicleId('');
              setExpenseDate(new Date().toISOString().slice(0, 10));
              setExpenseCategory('maintenance');
              setIsExpenseModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-error-600 hover:bg-error-700 text-white font-medium text-xs sm:text-sm transition-all shadow-xs"
            id="btn-add-expense"
          >
            <TrendingDown className="w-4 h-4" />
            <span>تسجيل مصروف جديد</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-secondary-100 hover:bg-secondary-200 text-secondary-700 text-xs sm:text-sm font-medium transition-all print:hidden"
            title="طباعة التقرير المالي"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">طباعة</span>
          </button>
        </div>
      </div>

      {/* Core Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Capital */}
        <div className="bg-white rounded-2xl p-5 border border-secondary-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                  إجمالي رأس المال
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                  أساسي + إضافات
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-secondary-900 mt-2 font-mono tracking-tight">
                {formatAed(currentTotalCap)}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-secondary-100 flex items-center justify-between text-xs text-secondary-500">
            <span className="flex items-center gap-1 text-blue-600 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              قيمة ثابتة لا تتغير عند المصروفات
            </span>
            <span className="font-semibold text-secondary-700">
              {(data.capitalTransactions || []).filter((t) => t.type !== 'expense').length} عمليات إيداع
            </span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-2xl p-5 border border-secondary-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                  إجمالي المصروفات
                </span>
                <span className="px-2 py-0.5 rounded-md bg-error-50 text-error-700 text-[10px] font-bold border border-error-100">
                  تشغيل وصيانة
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-error-600 mt-2 font-mono tracking-tight">
                {formatAed(currentTotalExp)}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-error-50 text-error-600 flex items-center justify-center shrink-0 border border-error-100">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-secondary-100 flex items-center justify-between text-xs text-secondary-500">
            <span>
              نسبة الاستهلاك:{' '}
              <strong className="text-error-600">
                {currentTotalCap > 0 ? ((currentTotalExp / currentTotalCap) * 100).toFixed(1) : 0}%
              </strong>
            </span>
            <span className="font-semibold text-secondary-700">
              {(data.capitalTransactions || []).filter((t) => t.type === 'expense').length} مصروف مسجل
            </span>
          </div>
        </div>

        {/* Remaining Capital */}
        <div
          className={`rounded-2xl p-5 border shadow-xs relative overflow-hidden ${
            currentRemaining >= 0
              ? 'bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 border-emerald-200/80'
              : 'bg-gradient-to-br from-error-50/50 via-white to-error-50/30 border-error-200/80'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  رأس المال المتبقي
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    currentRemaining >= 0
                      ? 'bg-emerald-100/70 text-emerald-800 border-emerald-200'
                      : 'bg-error-100/70 text-error-800 border-error-200'
                  }`}
                >
                  الرصيد الصافي
                </span>
              </div>
              <p
                className={`text-2xl sm:text-3xl font-extrabold mt-2 font-mono tracking-tight ${
                  currentRemaining >= 0 ? 'text-emerald-700' : 'text-error-700'
                }`}
              >
                {formatAed(currentRemaining)}
              </p>
            </div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                currentRemaining >= 0
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-error-100 text-error-700 border-error-200'
              }`}
            >
              <WalletCards className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-secondary-200/60 flex items-center justify-between text-xs text-secondary-600">
            <span className="font-mono text-[11px] text-secondary-500">
              ({formatAed(currentTotalCap)} - {formatAed(currentTotalExp)})
            </span>
            <span className="font-semibold text-emerald-700">
              السيولة المتاحة:{' '}
              {currentTotalCap > 0 ? ((currentRemaining / currentTotalCap) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Insights: Vehicle Expenses & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-secondary-200/80 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-secondary-100">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary-600" />
              <h2 className="text-base font-bold text-secondary-900">توزيع المصروفات حسب التصنيف</h2>
            </div>
            <span className="text-xs text-secondary-500 font-medium">
              إجمالي {formatAed(currentTotalExp)}
            </span>
          </div>

          {categorySummary.length === 0 ? (
            <div className="py-8 text-center text-secondary-400 text-sm">
              لم يتم تسجيل أي مصروفات حتى الآن
            </div>
          ) : (
            <div className="space-y-3">
              {categorySummary.map((cat) => {
                const def = EXPENSE_CATEGORIES.find((c) => c.id === cat.id);
                const Icon = def?.icon || Receipt;
                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border ${def?.color || 'bg-secondary-50'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-secondary-800">{cat.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-secondary-900">
                          {formatAed(cat.amount)}
                        </span>
                        <span className="text-secondary-400 font-mono text-[11px]">
                          ({cat.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-secondary-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, cat.percentage))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fleet & Vehicles Expenses */}
        <div className="bg-white rounded-2xl p-5 border border-secondary-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-secondary-100">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-secondary-900">مصروفات وصيانة الأسطول</h2>
            </div>
          </div>

          {vehicleExpensesSummary.length === 0 ? (
            <div className="py-8 text-center text-secondary-400 text-sm">
              لا توجد مصروفات مسجلة على مركبات محددة
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {vehicleExpensesSummary.map((v, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-secondary-50/80 border border-secondary-100 hover:bg-secondary-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Car className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-secondary-900 truncate">{v.vehicleName}</p>
                      <p className="text-[10px] text-secondary-500">{v.count} عمليات صيانة/وقود</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-extrabold text-error-600 shrink-0">
                    {formatAed(v.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-secondary-200/80 shadow-xs space-y-3 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-secondary-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث في الوصف، القائم بالعملية، السيارة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs sm:text-sm rounded-xl border border-secondary-200 bg-secondary-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-secondary-200 bg-secondary-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium text-secondary-800"
            >
              <option value="all">جميع العمليات (الكل)</option>
              <option value="capital">رأس المال فقط (إيداعات)</option>
              <option value="expense">المصروفات فقط</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-secondary-200 bg-secondary-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium text-secondary-800"
            >
              <option value="all">جميع التصنيفات</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-secondary-200 bg-secondary-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium text-secondary-800"
            >
              <option value="all">كل الفترات الزمنية</option>
              <option value="this_month">هذا الشهر الحالي</option>
              <option value="last_30_days">آخر 30 يوماً</option>
            </select>
          </div>
        </div>

        {/* Vehicle filter chips if vehicles exist */}
        {data.vehicles && data.vehicles.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-secondary-100 overflow-x-auto scrollbar-thin pb-1">
            <span className="text-xs font-bold text-secondary-500 shrink-0">فلترة بالسيارة:</span>
            <button
              onClick={() => setFilterVehicle('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterVehicle === 'all'
                  ? 'bg-secondary-800 text-white'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              }`}
            >
              الكل
            </button>
            {data.vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => setFilterVehicle(v.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  filterVehicle === v.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                }`}
              >
                {v.name} ({v.plateNumber})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transactions Ledger Table */}
      <div className="bg-white rounded-2xl border border-secondary-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-secondary-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-secondary-900">
              سجل حركات رأس المال والمصروفات
            </h2>
            <p className="text-xs text-secondary-500 mt-0.5">
              عرض تفصيلي لكل عملية مع الرصيد قبل وبعد وإجمالي رأس المال
            </p>
          </div>
          <span className="text-xs font-bold text-secondary-600 px-3 py-1 bg-secondary-100 rounded-lg self-start sm:self-auto">
            {filteredTransactions.length} عملية
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary-100 text-secondary-400 flex items-center justify-center mx-auto mb-3">
              <WalletCards className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-secondary-800">لا توجد عمليات مطابقة</h3>
            <p className="text-xs text-secondary-500 mt-1 max-w-sm mx-auto">
              لم يتم العثور على حركات مالية مطابقة للفلاتر المحددة. يمكنك إضافة رأس مال جديد أو تسجيل مصروف.
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterCategory('all');
                  setFilterVehicle('all');
                  setDateFilter('all');
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-secondary-100 text-secondary-700 hover:bg-secondary-200 transition-all"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-secondary-50/80 border-b border-secondary-200/80 text-secondary-600 font-semibold">
                  <th className="py-3 px-4 whitespace-nowrap">التاريخ</th>
                  <th className="py-3 px-4 whitespace-nowrap">نوع العملية</th>
                  <th className="py-3 px-4 whitespace-nowrap">التصنيف / السيارة</th>
                  <th className="py-3 px-4">البيان والوصف</th>
                  <th className="py-3 px-4 whitespace-nowrap">المبلغ</th>
                  <th className="py-3 px-4 whitespace-nowrap text-secondary-500">إجمالي رأس المال</th>
                  <th className="py-3 px-4 whitespace-nowrap text-secondary-500">الرصيد قبل</th>
                  <th className="py-3 px-4 whitespace-nowrap font-bold">الرصيد المتبقي بعد</th>
                  <th className="py-3 px-4 whitespace-nowrap text-secondary-500">القائم بالعملية</th>
                  <th className="py-3 px-4 whitespace-nowrap text-center print:hidden">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {filteredTransactions.map((tx) => {
                  const isExpense = tx.type === 'expense';
                  const isInitial = tx.type === 'capital_initial';
                  const isInjection = tx.type === 'capital_injection';
                  const catDef = EXPENSE_CATEGORIES.find((c) => c.id === tx.category);

                  return (
                    <tr key={tx.id} className="hover:bg-secondary-50/60 transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-xs text-secondary-700 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isExpense && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-error-50 text-error-700 border border-error-200">
                            <ArrowDownRight className="w-3.5 h-3.5 text-error-600" />
                            مصروف
                          </span>
                        )}
                        {isInitial && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            رأس مال تأسيسي
                          </span>
                        )}
                        {isInjection && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                            إضافة رأس مال
                          </span>
                        )}
                      </td>

                      {/* Category & Vehicle */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-secondary-800 text-xs">
                            {isExpense ? catDef?.label || tx.category || 'مصروف عام' : 'تمويل / رأس مال'}
                          </p>
                          {tx.vehicleName && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                              <Truck className="w-3 h-3" />
                              {tx.vehicleName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 text-secondary-800 font-medium">
                        {tx.description}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-mono font-extrabold whitespace-nowrap text-sm">
                        <span className={isExpense ? 'text-error-600' : 'text-emerald-600'}>
                          {isExpense ? '-' : '+'} {formatAed(tx.amount)}
                        </span>
                      </td>

                      {/* Total Capital After */}
                      <td className="py-3.5 px-4 font-mono text-xs text-blue-800 font-semibold whitespace-nowrap">
                        {formatAed(tx.totalCapitalAfter ?? currentTotalCap)}
                      </td>

                      {/* Balance Before */}
                      <td className="py-3.5 px-4 font-mono text-xs text-secondary-500 whitespace-nowrap">
                        {formatAed(tx.balanceBefore)}
                      </td>

                      {/* Balance After */}
                      <td className="py-3.5 px-4 font-mono text-xs font-extrabold whitespace-nowrap">
                        <span className={tx.balanceAfter >= 0 ? 'text-emerald-700' : 'text-error-700'}>
                          {formatAed(tx.balanceAfter)}
                        </span>
                      </td>

                      {/* Created By */}
                      <td className="py-3.5 px-4 text-xs text-secondary-500 whitespace-nowrap">
                        {tx.createdByName || 'الإدارة'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(tx)}
                            className="p-1.5 rounded-lg text-secondary-500 hover:bg-secondary-100 hover:text-primary-600 transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(tx.id)}
                            className="p-1.5 rounded-lg text-secondary-500 hover:bg-error-50 hover:text-error-600 transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add / Edit Capital */}
      <Modal
        open={isCapitalModalOpen}
        onClose={() => {
          setIsCapitalModalOpen(false);
          setEditingTx(null);
        }}
        title={editingTx ? 'تعديل حركة رأس المال' : 'إضافة / ضخ رأس مال للمشروع'}
      >
        <form onSubmit={handleSaveCapital} className="space-y-4" style={{ direction: 'rtl' }}>
          {!editingTx && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCapitalType('capital_injection')}
                className={`p-3 rounded-xl border text-center font-bold text-xs sm:text-sm transition-all ${
                  capitalType === 'capital_injection'
                    ? 'bg-primary-50 border-primary-500 text-primary-700 ring-2 ring-primary-500/20'
                    : 'bg-white border-secondary-200 text-secondary-600 hover:bg-secondary-50'
                }`}
              >
                <ArrowUpRight className="w-5 h-5 mx-auto mb-1 text-primary-600" />
                ضخ رأس مال إضافي
              </button>
              <button
                type="button"
                onClick={() => setCapitalType('capital_initial')}
                className={`p-3 rounded-xl border text-center font-bold text-xs sm:text-sm transition-all ${
                  capitalType === 'capital_initial'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                    : 'bg-white border-secondary-200 text-secondary-600 hover:bg-secondary-50'
                }`}
              >
                <ShieldCheck className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                رأس مال تأسيسي
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-secondary-700 mb-1.5">
              المبلغ (بالدينار الليبي د.ل) <span className="text-error-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              placeholder="مثال: 50000 أو 10000"
              value={capitalAmount}
              onChange={(e) => setCapitalAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-secondary-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-base font-mono font-bold text-secondary-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary-700 mb-1.5">
              التاريخ <span className="text-error-500">*</span>
            </label>
            <input
              type="date"
              required
              value={capitalDate}
              onChange={(e) => setCapitalDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-secondary-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-xs sm:text-sm text-secondary-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary-700 mb-1.5">
              البيان / الوصف
            </label>
            <input
              type="text"
              placeholder={capitalType === 'capital_initial' ? 'مثال: تمويل رأس مال تأسيسي للمشروع' : 'مثال: زيادة رأس المال لشراء بضائع جديدة'}
              value={capitalDescription}
              onChange={(e) => setCapitalDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-secondary-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-xs sm:text-sm text-secondary-900"
            />
          </div>

          {/* Real-time calculation preview */}
          {parseFloat(capitalAmount) > 0 && (
            <div className="p-3.5 rounded-xl bg-primary-50/70 border border-primary-200/80 space-y-1.5 text-xs text-primary-900">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary-600" />
                معاينة أثر العملية:
              </p>
              <div className="flex justify-between border-t border-primary-200/50 pt-1.5">
                <span>إجمالي رأس المال الجديد:</span>
                <span className="font-mono font-bold">
                  {formatAed(currentTotalCap + parseFloat(capitalAmount))}
                </span>
              </div>
              <div className="flex justify-between">
                <span>رأس المال المتبقي الجديد:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatAed(currentRemaining + parseFloat(capitalAmount))}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-secondary-100">
            <button
              type="button"
              onClick={() => setIsCapitalModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-secondary-600 hover:bg-secondary-100 transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white transition-all shadow-xs"
            >
              {editingTx ? 'حفظ التعديلات' : 'إيداع رأس المال'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add / Edit Expense */}
      <Modal
        open={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingTx(null);
        }}
        title={editingTx ? 'تعديل المصروف' : 'تسجيل مصروف تشغيلي / صيانة جديد'}
      >
        <form onSubmit={handleSaveExpense} className="space-y-4" style={{ direction: 'rtl' }}>
          <div>
            <label className="block text-xs font-bold text-secondary-700 mb-1.5">
              تصنيف المصروف <span className="text-error-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = expenseCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setExpenseCategory(cat.id)}
                    className={`p-2.5 rounded-xl border text-center font-medium text-xs flex flex-col items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-error-50 border-error-500 text-error-800 ring-2 ring-error-500/20 font-bold'
                        : 'bg-white border-secondary-200 text-secondary-700 hover:bg-secondary-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-error-600' : 'text-secondary-500'}`} />
                    <span className="truncate w-full text-[11px]">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vehicle selector (always available, emphasized if maintenance/fuel) */}
          <div>
            <label className="block text-xs font-bold text-secondary-700 mb-1.5">
              ربط بمركبة / سيارة من الأسطول {expenseCategory === 'maintenance' || expenseCategory === 'fuel' ? '(مستحسن)' : '(اختياري)'}
            </label>
            <select
              value={expenseVehicleId}
              onChange={(e) => setExpenseVehicleId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-secondary-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-xs sm:text-sm text-secondary-900 font-medium"
            >
              <option value="">-- بدون ربط بمركبة محددة (مصروف عام) --</option>
              {data.vehicles?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} - لوحة: {v.plateNumber} ({v.model || v.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary-700 mb-1.5">
              قيمة المصروف (د.ل) <span className="text-error-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              placeholder="مثال: 1000 أو 250"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-secondary-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-base font-mono font-bold text-error-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary-700 mb-1.5">
              التاريخ <span className="text-error-500">*</span>
            </label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-secondary-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-xs sm:text-sm text-secondary-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary-700 mb-1.5">
              البيان وتفاصيل المصروف
            </label>
            <input
              type="text"
              placeholder="مثال: تغيير فحمات وزيت للمركبة، وقود جولة طرابلس، إيجار شهر 6..."
              value={expenseDescription}
              onChange={(e) => setExpenseDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-secondary-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-xs sm:text-sm text-secondary-900"
            />
          </div>

          {/* Real-time deduction preview */}
          {parseFloat(expenseAmount) > 0 && (
            <div className="p-3.5 rounded-xl bg-error-50/70 border border-error-200/80 space-y-1.5 text-xs text-error-900">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-error-600" />
                تأثير المصروف على رأس المال:
              </p>
              <div className="flex justify-between border-t border-error-200/50 pt-1.5 text-secondary-700">
                <span>إجمالي رأس المال الأساسي:</span>
                <span className="font-mono font-bold text-blue-700">
                  {formatAed(currentTotalCap)} (يبقى ثابتاً لا ينقص)
                </span>
              </div>
              <div className="flex justify-between">
                <span>رأس المال المتبقي بعد الخصم:</span>
                <span className="font-mono font-bold text-error-700">
                  {formatAed(currentRemaining - parseFloat(expenseAmount))}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-secondary-100">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-secondary-600 hover:bg-secondary-100 transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-error-600 hover:bg-error-700 text-white transition-all shadow-xs"
            >
              {editingTx ? 'حفظ التعديلات' : 'تسجيل وخصم المصروف'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="تأكيد حذف الحركة المالية"
      >
        <div className="space-y-4 text-right" style={{ direction: 'rtl' }}>
          <p className="text-sm text-secondary-700 leading-relaxed">
            هل أنت متأكد من رغبتك في حذف هذه العملية المالية؟ سيتم إعادة حساب إجمالي رأس المال والرصيد المتبقي بناءً على ذلك.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-secondary-100">
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-secondary-600 hover:bg-secondary-100 transition-all"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-error-600 hover:bg-error-700 text-white transition-all shadow-xs"
            >
              نعم، حذف
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
