import { useMemo, useState } from 'react';
import {
  Users, Plus, Search, X, Phone, MapPin, Wallet,
  ArrowDownLeft, FileText, TrendingUp, Building2, PieChart,
  Banknote, Trash2, Pencil, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/Badge';
import { Button, Input, Select, EmptyState } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { formatAed, formatDate, todayISO } from '@/lib/format';
import { libyanCities, cityLabel, cityAreas } from '@/lib/geo';
import { cleanPersonName } from '@/components/PrintInvoiceModal';
import type { Shop } from '@/types';

export function Shops() {
  const { role, currentUser, data, shopBalance, addShop, updateShop, deleteShop } = useApp();
  const isAdmin = role === 'admin';
  const [query, setQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'my_shops' | 'all'>(isAdmin ? 'all' : 'my_shops');
  const [cityFilter, setCityFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [showRegions, setShowRegions] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);
  const [shopToEdit, setShopToEdit] = useState<Shop | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const availableAreas = cityFilter !== 'all' ? cityAreas(cityFilter) : [];

  // Helper to get stats for a shop scoped to current user or admin
  const getShopStats = (shopId: string) => {
    if (isAdmin) {
      const balance = shopBalance(shopId);
      const invCount = data.invoices.filter((i) => i.shopId === shopId).length;
      return { balance, invCount, hasDealt: invCount > 0 };
    }
    const myInvoices = data.invoices.filter((i) => i.shopId === shopId && i.createdBy === currentUser.id);
    const myPayments = data.payments.filter((p) => p.shopId === shopId && p.createdBy === currentUser.id);
    const invCount = myInvoices.length;
    const myTotal = myInvoices.reduce((s, i) => s + i.total, 0);
    const myPaid = myInvoices.reduce((s, i) => s + i.paidAmount, 0);
    const myDirectPayments = myPayments.reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, (myTotal - myPaid) - myDirectPayments);
    const hasDealt = myInvoices.length > 0 || myPayments.length > 0;
    return { balance, invCount, hasDealt };
  };

  const myDealtShopsCount = useMemo(() => {
    return data.shops.filter((s) => {
      const myInvs = data.invoices.some((i) => i.shopId === s.id && i.createdBy === currentUser.id);
      const myPays = data.payments.some((p) => p.shopId === s.id && p.createdBy === currentUser.id);
      return myInvs || myPays;
    }).length;
  }, [data.shops, data.invoices, data.payments, currentUser.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.shops.filter((s) => {
      const stats = getShopStats(s.id);
      if (!isAdmin && scopeFilter === 'my_shops' && !stats.hasDealt) {
        return false;
      }
      const matchesQ = !q || s.name.toLowerCase().includes(q) || s.ownerName.toLowerCase().includes(q) || s.phone.includes(q);
      const matchesCity = cityFilter === 'all' || s.city === cityFilter;
      const matchesArea = areaFilter === 'all' || s.area === areaFilter;
      return matchesQ && matchesCity && matchesArea;
    });
  }, [data.shops, data.invoices, data.payments, query, cityFilter, areaFilter, scopeFilter, isAdmin, currentUser.id]);

  const totalFilteredDebt = filtered.reduce((sum, s) => sum + getShopStats(s.id).balance, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-secondary-900">{isAdmin ? 'العملاء والمحلات' : 'دليل عملاء ومحلات التوزيع'}</h2>
          <p className="text-sm text-secondary-500">
            {isAdmin
              ? `${data.shops.length} عميل مسجل بالنظام`
              : `تعاملت مع ${myDealtShopsCount} محل من أصل ${data.shops.length} بالدليل العام`}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="secondary" icon={<PieChart className="w-4 h-4" />} onClick={() => setShowRegions(true)} size="sm">
              الديون حسب المنطقة
            </Button>
          )}
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)} size="sm">عميل جديد</Button>
        </div>
      </div>

      {/* Scope toggle for sales rep */}
      {!isAdmin && (
        <div className="flex rounded-xl bg-secondary-100/80 p-1 gap-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setScopeFilter('my_shops')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              scopeFilter === 'my_shops'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            محلاتي التي تعاملت معها ({myDealtShopsCount})
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('all')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              scopeFilter === 'all'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            دليل كافة المحلات ({data.shops.length})
          </button>
        </div>
      )}

      {/* Search + filters */}
      <div className="rounded-2xl bg-white ring-1 ring-secondary-100 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم المحل أو المالك أو الهاتف..."
            className="w-full rounded-xl border-0 bg-secondary-50 pr-11 pl-4 py-2.5 text-secondary-900 placeholder:text-secondary-400 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={cityFilter}
            onChange={(e) => { setCityFilter(e.target.value); setAreaFilter('all'); }}
            className="rounded-xl bg-secondary-50 px-3 py-2 text-sm text-secondary-700 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="all">كل المدن</option>
            {libyanCities.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {availableAreas.length > 0 && (
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="rounded-xl bg-secondary-50 px-3 py-2 text-sm text-secondary-700 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="all">كل المناطق</option>
              {availableAreas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          )}
          {(cityFilter !== 'all' || areaFilter !== 'all') && (
            <button
              onClick={() => { setCityFilter('all'); setAreaFilter('all'); }}
              className="px-3 py-2 text-sm text-secondary-500 hover:text-secondary-700"
            >
              مسح الفلتر
            </button>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between text-sm pt-1 border-t border-secondary-50">
            <span className="text-secondary-500">{filtered.length} عميل</span>
            <span className="text-secondary-500">
              {isAdmin ? 'إجمالي ديون المحلات: ' : 'إجمالي الآجل المتبقي على فواتيري: '}
              <span className={`font-bold tabular-nums ${totalFilteredDebt > 0 ? 'text-error-600' : 'text-success-600'}`}>
                {formatAed(totalFilteredDebt)}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-secondary-100">
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="لا يوجد عملاء مطابقة"
            description={
              !isAdmin && scopeFilter === 'my_shops'
                ? 'لم تقم بإصدار فواتير لأي محل في هذه القائمة بعد. يمكنك التبديل إلى "دليل كافة المحلات" واختيار أي محل لإصدار فاتورة.'
                : 'جرّب تغيير خيارات البحث أو أضف عميلاً جديداً.'
            }
            action={
              !isAdmin && scopeFilter === 'my_shops' ? (
                <Button size="sm" variant="secondary" onClick={() => setScopeFilter('all')}>
                  عرض دليل كافة المحلات
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((shop) => {
            const stats = getShopStats(shop.id);
            const balance = stats.balance;
            const invCount = stats.invCount;
            const hasDealt = stats.hasDealt;

            return (
              <div
                key={shop.id}
                onClick={() => setSelectedShop(shop)}
                className="text-right rounded-2xl bg-white ring-1 ring-secondary-100 shadow-sm p-4 hover:shadow-md hover:ring-primary-200 transition-all cursor-pointer relative group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-bold text-secondary-900 text-sm truncate">{shop.name}</h3>
                        {!isAdmin && hasDealt && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 font-bold shrink-0">
                            تعاملت معه
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShopToEdit(shop);
                          }}
                          className="p-1 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="تعديل بيانات العميل"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShopToDelete(shop);
                          }}
                          className="p-1 rounded-lg text-secondary-400 hover:text-error-600 hover:bg-error-50 transition-colors"
                          title="حذف العميل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-secondary-500 truncate">{shop.ownerName}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-secondary-400 flex-wrap">
                      <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{shop.phone}</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {cityLabel(shop.city)}{shop.area && ` - ${shop.area}`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-secondary-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge tone={invCount > 0 ? 'primary' : 'neutral'} icon={<FileText className="w-3 h-3" />}>
                      {isAdmin
                        ? `${invCount} فاتورة`
                        : invCount > 0
                        ? `${invCount} فاتورة لك`
                        : 'لم تسجل فواتير له'}
                    </Badge>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-secondary-400">
                      {isAdmin ? 'الرصيد المستحق' : 'الآجل على فواتيرك'}
                    </p>
                    {!isAdmin && !hasDealt ? (
                      <p className="text-xs font-semibold text-secondary-400">0.00 د.ل</p>
                    ) : (
                      <p className={`text-base font-bold tabular-nums ${balance > 0 ? 'text-error-600' : 'text-success-600'}`}>
                        {formatAed(Math.abs(balance))}
                        {balance > 0 && <span className="text-xs font-normal mr-1">{isAdmin ? 'مدين' : 'متبقي'}</span>}
                        {balance === 0 && <span className="text-xs font-normal mr-1">خالص</span>}
                        {balance < 0 && <span className="text-xs font-normal mr-1">دائن</span>}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedShop && (
        <ShopDetailModal
          shop={selectedShop}
          onClose={() => setSelectedShop(null)}
          onEdit={(s) => setShopToEdit(s)}
          onDelete={(s) => {
            setSelectedShop(null);
            setShopToDelete(s);
          }}
        />
      )}
      {addOpen && (
        <AddShopModal
          onClose={() => setAddOpen(false)}
          onAdd={async (s) => {
            await addShop(s);
            setScopeFilter('all');
          }}
        />
      )}
      {shopToEdit && (
        <EditShopModal
          shop={shopToEdit}
          onClose={() => setShopToEdit(null)}
          onSave={(patch) => {
            updateShop(shopToEdit.id, patch);
            if (selectedShop && selectedShop.id === shopToEdit.id) {
              setSelectedShop((prev) => (prev ? { ...prev, ...patch } : null));
            }
          }}
        />
      )}
      {shopToDelete && (
        <DeleteShopModal
          shop={shopToDelete}
          onClose={() => setShopToDelete(null)}
          onConfirm={async () => {
            await deleteShop(shopToDelete.id);
            if (selectedShop && selectedShop.id === shopToDelete.id) {
              setSelectedShop(null);
            }
          }}
        />
      )}
      {showRegions && <RegionsModal onClose={() => setShowRegions(false)} />}
    </div>
  );
}

function RegionsModal({ onClose }: { onClose: () => void }) {
  const { data, shopBalance, debtsByCity } = useApp();
  const cityDebts = debtsByCity();
  const grandTotal = cityDebts.reduce((s, c) => s + c.debt, 0);

  // Build area-level breakdown for Tripoli
  const tripoliShops = data.shops.filter((s) => s.city === 'tripoli');
  const areaMap = new Map<string, { debt: number; count: number }>();
  tripoliShops.forEach((s) => {
    const bal = Math.max(0, shopBalance(s.id));
    const area = s.area || 'غير محدد';
    const ex = areaMap.get(area) ?? { debt: 0, count: 0 };
    ex.debt += bal;
    ex.count += 1;
    areaMap.set(area, ex);
  });
  const areaDebts = Array.from(areaMap.entries())
    .map(([area, v]) => ({ area, ...v }))
    .sort((a, b) => b.debt - a.debt);

  return (
    <Modal
      open
      onClose={onClose}
      title="الديون حسب المنطقة"
      size="lg"
      footer={<Button variant="secondary" fullWidth onClick={onClose}>إغلاق</Button>}
    >
      <div className="space-y-4">
        {/* Grand total */}
        <div className="rounded-2xl bg-gradient-to-l from-error-600 to-error-500 p-4 text-white shadow-sm">
          <p className="text-error-100 text-sm">إجمالي الديون المستحقة</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{formatAed(grandTotal)}</p>
          <p className="text-error-100 text-xs mt-1">{data.shops.length} عميل • {cityDebts.length} مدينة</p>
        </div>

        {/* By city */}
        <div className="rounded-xl ring-1 ring-secondary-200 overflow-hidden">
          <div className="px-3 py-2 bg-secondary-50 border-b border-secondary-100">
            <h4 className="font-bold text-secondary-800 text-sm">حسب المدينة</h4>
          </div>
          <div className="divide-y divide-secondary-50">
            {cityDebts.map((c) => (
              <div key={c.city} className="px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-secondary-800">{cityLabel(c.city)}</p>
                    <p className="text-xs text-secondary-400">{c.shopCount} عميل</p>
                  </div>
                </div>
                <span className="font-bold text-error-600 tabular-nums shrink-0">{formatAed(c.debt)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tripoli area breakdown */}
        {areaDebts.length > 0 && (
          <div className="rounded-xl ring-1 ring-secondary-200 overflow-hidden">
            <div className="px-3 py-2 bg-secondary-50 border-b border-secondary-100">
              <h4 className="font-bold text-secondary-800 text-sm">تفصيل مناطق طرابلس</h4>
            </div>
            <div className="divide-y divide-secondary-50 max-h-60 overflow-y-auto scrollbar-thin">
              {areaDebts.map((a) => (
                <div key={a.area} className="px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-secondary-800 truncate">{a.area}</p>
                    <p className="text-xs text-secondary-400">{a.count} عميل</p>
                  </div>
                  <span className="font-bold text-error-600 tabular-nums text-sm shrink-0">{formatAed(a.debt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ShopDetailModal({
  shop,
  onClose,
  onEdit,
  onDelete,
}: {
  shop: Shop;
  onClose: () => void;
  onEdit?: (shop: Shop) => void;
  onDelete?: (shop: Shop) => void;
}) {
  const { role, currentUser, data, shopBalance, addPayment } = useApp();
  const isAdmin = role === 'admin';
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleType, setSettleType] = useState<'cash' | 'bank' | 'mixed'>('cash');
  const [singleAmount, setSingleAmount] = useState<number>(0);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [bankAmount, setBankAmount] = useState<number>(0);
  const [settleNote, setSettleNote] = useState('');

  const invoices = isAdmin
    ? data.invoices.filter((i) => i.shopId === shop.id)
    : data.invoices.filter((i) => i.shopId === shop.id && i.createdBy === currentUser.id);

  const payments = isAdmin
    ? data.payments.filter((p) => p.shopId === shop.id)
    : data.payments.filter((p) => p.shopId === shop.id && p.createdBy === currentUser.id);

  const invoicesTotal = invoices.reduce((s, i) => s + i.total, 0);
  const invoicesPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const directPayments = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = invoicesPaid + directPayments;

  const balance = isAdmin
    ? shopBalance(shop.id)
    : Math.max(0, (invoicesTotal - invoicesPaid) - directPayments);

  const totalSettle = settleType === 'mixed' ? (Number(cashAmount) || 0) + (Number(bankAmount) || 0) : (Number(singleAmount) || 0);

  type Entry = {
    date: string;
    desc: string;
    debit: number;
    credit: number;
    method?: string;
    cashPart?: number;
    bankPart?: number;
  };

  const entries: Entry[] = [
    ...invoices.map((inv) => ({
      date: inv.date,
      desc: `فاتورة ${inv.number}${!isAdmin ? '' : cleanPersonName(inv.createdByName) ? ` (مندوب: ${cleanPersonName(inv.createdByName)})` : ''}`,
      debit: inv.total - inv.paidAmount,
      credit: inv.paidAmount,
      method: inv.paymentMethod,
      cashPart: inv.cashAmount,
      bankPart: inv.bankAmount,
    })),
    ...payments.map((p) => ({
      date: p.date,
      desc: p.note || 'دفعة سداد',
      debit: 0,
      credit: p.amount,
      method: p.method,
      cashPart: p.cashAmount,
      bankPart: p.bankAmount,
    })),
  ];
  if (isAdmin && shop.openingBalance > 0) {
    entries.push({ date: shop.createdAt, desc: 'رصيد افتتاحي للشركة', debit: shop.openingBalance, credit: 0 });
  }
  entries.sort((a, b) => b.date.localeCompare(a.date));

  const handleConfirmSettle = () => {
    if (totalSettle <= 0) return;
    if (settleType === 'mixed') {
      const c = Number(cashAmount) || 0;
      const b = Number(bankAmount) || 0;
      addPayment({
        shopId: shop.id,
        amount: c + b,
        method: 'mixed',
        cashAmount: c,
        bankAmount: b,
        date: todayISO(),
        note: settleNote || `سداد مختلط (كاش ${formatAed(c)} + بنك ${formatAed(b)})`,
      });
    } else {
      const amt = Number(singleAmount) || 0;
      addPayment({
        shopId: shop.id,
        amount: amt,
        method: settleType,
        cashAmount: settleType === 'cash' ? amt : 0,
        bankAmount: settleType === 'bank' ? amt : 0,
        date: todayISO(),
        note: settleNote || (settleType === 'cash' ? 'سداد نقداً (كاش)' : 'سداد تحويل مصرفي'),
      });
    }
    setSettleOpen(false);
  };

  const methodLabel = (m?: string, c?: number, b?: number) => {
    if (!m) return '';
    if (m === 'cash') return 'نقداً';
    if (m === 'bank') return 'تحويل مصرفي';
    if (m === 'mixed') {
      if (c !== undefined && b !== undefined && c > 0 && b > 0) {
        return `مختلط (كاش ${formatAed(c)} + بنك ${formatAed(b)})`;
      }
      return 'مختلط (كاش + بنك)';
    }
    if (m === 'credit') return 'آجل';
    return m;
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={shop.name}
      size="lg"
      footer={
        balance > 0 ? (
          <Button
            fullWidth
            icon={<Wallet className="w-4 h-4" />}
            onClick={() => {
              setSettleType('cash');
              setSingleAmount(balance);
              setCashAmount(Math.round(balance / 2));
              setBankAmount(balance - Math.round(balance / 2));
              setSettleNote('');
              setSettleOpen(true);
            }}
          >
            {isAdmin ? 'تسوية دين / سداد متبقي' : 'تسوية الآجل وتحصيل دفعة'}
          </Button>
        ) : (
          <Button variant="secondary" fullWidth onClick={onClose}>
            إغلاق
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {!isAdmin && (
          <div className="p-2.5 rounded-xl bg-primary-50/70 ring-1 ring-primary-200/50 text-xs text-primary-900 flex items-center justify-between">
            <span>كشف حساب معاملات المندوب: <strong>{currentUser.name}</strong></span>
            <span className="text-[11px] text-primary-700">فواتيرك وتحصيلاتك فقط</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-3 rounded-xl bg-secondary-50 p-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-secondary-900">{shop.ownerName}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-secondary-500 flex-wrap">
                <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{shop.phone}</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {cityLabel(shop.city)}{shop.area && ` - ${shop.area}`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(shop)}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-secondary-200 text-secondary-700 hover:text-primary-700 hover:border-primary-300 transition-all text-xs font-bold flex items-center gap-1 shadow-xs"
                title="تعديل بيانات العميل"
              >
                <Pencil className="w-3.5 h-3.5 text-primary-600" />
                <span className="hidden sm:inline">تعديل</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(shop)}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-error-200 text-error-600 hover:bg-error-50 hover:border-error-300 transition-all text-xs font-bold flex items-center gap-1 shadow-xs"
                title="حذف العميل"
              >
                <Trash2 className="w-3.5 h-3.5 text-error-600" />
                <span className="hidden sm:inline">حذف</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-error-50 ring-1 ring-error-100 p-3 text-center">
            <p className="text-[10px] text-error-600 font-medium">{isAdmin ? 'رصيد مدين إجمالي' : 'الآجل المتبقي على فواتيري'}</p>
            <p className="text-base font-bold text-error-700 tabular-nums">{formatAed(Math.max(0, balance))}</p>
          </div>
          <div className="rounded-xl bg-secondary-50 ring-1 ring-secondary-200 p-3 text-center">
            <p className="text-[10px] text-secondary-500 font-medium">{isAdmin ? 'إجمالي الفواتير' : 'إجمالي فواتيري'}</p>
            <p className="text-base font-bold text-secondary-800 tabular-nums">{formatAed(invoicesTotal)}</p>
          </div>
          <div className="rounded-xl bg-success-50 ring-1 ring-success-100 p-3 text-center">
            <p className="text-[10px] text-success-600 font-medium">{isAdmin ? 'إجمالي المدفوع' : 'إجمالي تحصيلاتي'}</p>
            <p className="text-base font-bold text-success-700 tabular-nums">{formatAed(totalPaid)}</p>
          </div>
        </div>

        <div className="rounded-xl ring-1 ring-secondary-200 overflow-hidden">
          <div className="px-3 py-2 bg-secondary-50 border-b border-secondary-100 flex items-center justify-between">
            <h4 className="font-bold text-secondary-800 text-sm">
              {isAdmin ? 'كشف الحساب التفصيلي للعميل' : 'كشف فواتيري ومتحصلاتي مع المحل'}
            </h4>
            <span className="text-[11px] text-secondary-500">{entries.length} حركة</span>
          </div>
          <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-secondary-100">
            {entries.length === 0 ? (
              <p className="px-3 py-6 text-center text-secondary-400 text-sm">
                {!isAdmin
                  ? 'لا توجد فواتير أو حركات مسجلة باسمك لهذا المحل بعد'
                  : 'لا توجد حركات مسجلة'}
              </p>
            ) : (
              entries.map((e, idx) => (
                <div key={idx} className="px-3 py-2.5 flex items-center justify-between gap-2 text-sm hover:bg-secondary-50/60 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-secondary-800 text-xs truncate">{e.desc}</p>
                    <p className="text-[10px] text-secondary-500 mt-0.5">
                      {formatDate(e.date)}
                      {e.method && (
                        <span className="font-medium text-primary-700 mr-1">
                          • {methodLabel(e.method, e.cashPart, e.bankPart)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {e.debit > 0 && (
                      <span className="text-error-600 font-semibold tabular-nums text-xs flex items-center gap-1">
                        <ArrowDownLeft className="w-3 h-3" />
                        {formatAed(e.debit)}
                      </span>
                    )}
                    {e.credit > 0 && (
                      <span className="text-success-600 font-semibold tabular-nums text-xs flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {formatAed(e.credit)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {settleOpen && (
        <Modal
          open
          onClose={() => setSettleOpen(false)}
          title="تسوية وسداد دين المحل"
          size="md"
          footer={
            <div className="flex gap-2 w-full">
              <Button variant="secondary" onClick={() => setSettleOpen(false)} className="px-4">
                إلغاء
              </Button>
              <Button
                variant="success"
                fullWidth
                disabled={totalSettle <= 0}
                onClick={handleConfirmSettle}
              >
                تأكيد سداد ({formatAed(totalSettle)})
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-error-50 ring-1 ring-error-100 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-error-600 font-medium">الرصيد المستحق الحالي</p>
                <p className="text-xl font-extrabold text-error-700 tabular-nums mt-0.5">{formatAed(balance)}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (settleType === 'mixed') {
                    const half = Math.round(balance / 2);
                    setCashAmount(half);
                    setBankAmount(balance - half);
                  } else {
                    setSingleAmount(balance);
                  }
                }}
              >
                سداد كامل الدين
              </Button>
            </div>

            {/* Payment Method Selector */}
            <div>
              <span className="block text-xs font-bold text-secondary-700 mb-2">طريقة السداد</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSettleType('cash');
                    if (singleAmount <= 0) setSingleAmount(balance);
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    settleType === 'cash'
                      ? 'bg-primary-600 text-white shadow-sm ring-2 ring-primary-600/30'
                      : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>نقداً (كاش)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettleType('bank');
                    if (singleAmount <= 0) setSingleAmount(balance);
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    settleType === 'bank'
                      ? 'bg-primary-600 text-white shadow-sm ring-2 ring-primary-600/30'
                      : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>تحويل بنكي</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettleType('mixed');
                    if (cashAmount <= 0 && bankAmount <= 0) {
                      const half = Math.round((singleAmount || balance) / 2);
                      setCashAmount(half);
                      setBankAmount((singleAmount || balance) - half);
                    }
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    settleType === 'mixed'
                      ? 'bg-primary-600 text-white shadow-sm ring-2 ring-primary-600/30'
                      : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                  }`}
                >
                  <div className="flex items-center gap-0.5">
                    <Banknote className="w-3.5 h-3.5" />
                    <span className="text-[10px]">+</span>
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span>نصف كاش ونصف بنك (مختلط)</span>
                </button>
              </div>
            </div>

            {/* Inputs based on selection */}
            {settleType === 'mixed' ? (
              <div className="space-y-3 p-3.5 rounded-xl bg-primary-50/50 ring-1 ring-primary-100">
                <p className="text-xs font-bold text-primary-900">حدد المبالغ المقسمة (كاش + تحويل):</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-secondary-700 mb-1">
                      المدفوع نقداً (كاش) د.ل
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={cashAmount || ''}
                      onChange={(e) => setCashAmount(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-secondary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold tabular-nums text-sm text-success-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-secondary-700 mb-1">
                      المدفوع تحويل مصرفي د.ل
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={bankAmount || ''}
                      onChange={(e) => setBankAmount(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-secondary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold tabular-nums text-sm text-primary-700"
                    />
                  </div>
                </div>

                {/* Quick 50/50 Split buttons */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-secondary-500">تقسيم سريع من الرصيد:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const half = Math.round(balance / 2);
                        setCashAmount(half);
                        setBankAmount(balance - half);
                      }}
                      className="px-2 py-1 rounded-lg bg-white ring-1 ring-secondary-200 text-secondary-700 hover:bg-secondary-50 font-medium text-[11px]"
                    >
                      50% كاش / 50% بنك
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-primary-200 flex items-center justify-between text-xs font-bold text-secondary-900">
                  <span>إجمالي مبلغ الدفعة:</span>
                  <span className="text-base text-primary-900 font-mono tabular-nums">{formatAed(totalSettle)}</span>
                </div>
              </div>
            ) : (
              <Input
                label={`مبلغ الدفعة (${settleType === 'cash' ? 'نقداً كاش' : 'تحويل مصرفي'}) بالدينار`}
                type="number"
                min={0}
                value={singleAmount || ''}
                onChange={(e) => setSingleAmount(Number(e.target.value))}
                placeholder="0.00"
              />
            )}

            <div className="rounded-xl bg-secondary-50 p-2.5 flex items-center justify-between text-xs font-semibold">
              <span className="text-secondary-600">المتبقي بعد هذا السداد:</span>
              <span className={`font-mono font-bold tabular-nums text-sm ${balance - totalSettle <= 0 ? 'text-success-700' : 'text-error-600'}`}>
                {formatAed(Math.max(0, balance - totalSettle))}
              </span>
            </div>

            <Input
              label="ملاحظة أو رقم الحوالة / الإيصال (اختياري)"
              value={settleNote}
              onChange={(e) => setSettleNote(e.target.value)}
              placeholder="مثال: دفعة شيك رقم 4021 أو سداد نقدي مع الموزع"
            />
          </div>
        </Modal>
      )}
    </Modal>
  );
}

function AddShopModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (s: Omit<Shop, 'id' | 'createdAt'>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    phone: '',
    city: '',
    area: '',
    openingBalance: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string | number) => {
    setErrorMsg(null);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const valid = form.name.trim() && form.ownerName.trim() && form.phone.trim() && form.city;
  const areas = form.city ? cityAreas(form.city) : [];

  const handleSubmit = async () => {
    if (!valid || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onAdd({
        name: form.name.trim(),
        ownerName: form.ownerName.trim(),
        phone: form.phone.trim(),
        city: form.city,
        area: form.area || '',
        openingBalance: Number(form.openingBalance) || 0,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to add shop:', err);
      setErrorMsg(err?.message || 'تعذر إضافة العميل في قاعدة البيانات، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="عميل جديد"
      size="md"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button fullWidth disabled={!valid || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? 'جاري الحفظ في سوبابيز...' : 'إضافة العميل'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-error-50 border border-error-200 text-xs text-error-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-error-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        <Input
          label="اسم المحل *"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="مركز الخليج"
        />
        <Input
          label="اسم المالك / المسؤول *"
          value={form.ownerName}
          onChange={(e) => set('ownerName', e.target.value)}
          placeholder="أحمد المنصوري"
        />
        <Input
          label="رقم الهاتف *"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="0911234567"
        />
        <Select
          label="المدينة / المنطقة *"
          value={form.city}
          onChange={(e) => {
            set('city', e.target.value);
            set('area', '');
          }}
          options={[
            { value: '', label: 'اختر المدينة...' },
            ...libyanCities.map((c) => ({ value: c.value, label: c.label })),
          ]}
        />
        {areas.length > 0 && (
          <Select
            label="المنطقة / الحي"
            value={form.area}
            onChange={(e) => set('area', e.target.value)}
            options={[
              { value: '', label: 'اختر المنطقة...' },
              ...areas.map((a) => ({ value: a, label: a })),
            ]}
          />
        )}
        <Input
          label="الرصيد الافتتاحي (إن وجد ديون سابقة)"
          type="number"
          min={0}
          value={form.openingBalance || ''}
          onChange={(e) => set('openingBalance', Number(e.target.value))}
          placeholder="0.00"
        />
      </div>
    </Modal>
  );
}

function EditShopModal({
  shop,
  onClose,
  onSave,
}: {
  shop: Shop;
  onClose: () => void;
  onSave: (patch: Partial<Shop>) => void;
}) {
  const [form, setForm] = useState({
    name: shop.name,
    ownerName: shop.ownerName,
    phone: shop.phone,
    city: shop.city,
    area: shop.area || '',
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name.trim() && form.ownerName.trim() && form.phone.trim() && form.city;
  const areas = form.city ? cityAreas(form.city) : [];

  return (
    <Modal
      open
      onClose={onClose}
      title={`تعديل بيانات العميل: ${shop.name}`}
      size="md"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={onClose}>إلغاء</Button>
          <Button fullWidth disabled={!valid} onClick={() => { onSave(form); onClose(); }}>حفظ التعديلات</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Input label="اسم المحل" value={form.name} onChange={(e) => set('name', e.target.value)} />
        <Input label="اسم المالك" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} />
        <Input label="رقم الهاتف" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        <Select
          label="المدينة / المنطقة"
          value={form.city}
          onChange={(e) => {
            set('city', e.target.value);
            set('area', '');
          }}
          options={[{ value: '', label: 'اختر المدينة...' }, ...libyanCities.map((c) => ({ value: c.value, label: c.label }))]}
        />
        {areas.length > 0 && (
          <Select
            label="المنطقة / الحي"
            value={form.area}
            onChange={(e) => set('area', e.target.value)}
            options={[{ value: '', label: 'اختر المنطقة...' }, ...areas.map((a) => ({ value: a, label: a }))]}
          />
        )}
      </div>
    </Modal>
  );
}

function DeleteShopModal({
  shop,
  onClose,
  onConfirm,
}: {
  shop: Shop;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { data, shopBalance } = useApp();
  const [isDeleting, setIsDeleting] = useState(false);
  const balance = shopBalance(shop.id);
  const invoiceCount = data.invoices.filter((i) => i.shopId === shop.id).length;
  const paymentCount = data.payments.filter((p) => p.shopId === shop.id).length;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="تأكيد حذف العميل"
      size="md"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="secondary" onClick={onClose} fullWidth disabled={isDeleting}>
            إلغاء
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            fullWidth
            disabled={isDeleting}
            icon={<Trash2 className="w-4 h-4" />}
          >
            {isDeleting ? 'جاري الحذف...' : 'تأكيد حذف العميل نهائياً'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-error-50 border border-error-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-error-600 shrink-0 mt-0.5" />
          <div className="text-xs text-error-900 leading-relaxed">
            <p className="font-bold mb-0.5 text-sm">هل أنت متأكد من رغبتك في حذف هذا العميل؟</p>
            <p className="text-error-800">
              سيتم إزالة العميل <strong className="font-bold">"{shop.name}"</strong> من سجلات النظام وقائمة المحلات.
            </p>
          </div>
        </div>

        {/* Customer Information summary */}
        <div className="rounded-xl bg-secondary-50 border border-secondary-200 p-3 space-y-2 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-secondary-200">
            <span className="text-secondary-500">اسم المحل:</span>
            <span className="font-bold text-secondary-900">{shop.name}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-secondary-200">
            <span className="text-secondary-500">المالك / المسؤول:</span>
            <span className="font-medium text-secondary-800">{shop.ownerName}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-secondary-200">
            <span className="text-secondary-500">رقم الهاتف:</span>
            <span className="font-medium text-secondary-800 font-mono">{shop.phone}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-secondary-200">
            <span className="text-secondary-500">المدينة / المنطقة:</span>
            <span className="font-medium text-secondary-800">{cityLabel(shop.city)}{shop.area && ` - ${shop.area}`}</span>
          </div>

          {(invoiceCount > 0 || paymentCount > 0 || balance > 0) && (
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-secondary-600 block mb-1.5">
                سجل معاملات العميل:
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-lg border border-secondary-200">
                  <span className="text-[10px] text-secondary-400 block">فواتير</span>
                  <span className="font-bold text-secondary-900">{invoiceCount}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-secondary-200">
                  <span className="text-[10px] text-secondary-400 block">دفعات</span>
                  <span className="font-bold text-secondary-900">{paymentCount}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-secondary-200">
                  <span className="text-[10px] text-secondary-400 block">الرصيد</span>
                  <span className={`font-bold tabular-nums ${balance > 0 ? 'text-error-600' : 'text-success-600'}`}>
                    {formatAed(balance)}
                  </span>
                </div>
              </div>
              {balance > 0 && (
                <p className="text-[11px] text-error-600 mt-2 font-medium">
                  ⚠️ تنبيه: العميل عليه مديونية متبقية قدرها {formatAed(balance)}.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
