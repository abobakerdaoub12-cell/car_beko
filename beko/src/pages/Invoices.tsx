import { useMemo, useState } from 'react';
import {
  FileText, Plus, Search, X, ShoppingCart, Trash2,
  Banknote, Building2, Clock, MapPin, Truck, AlertCircle,
  Printer, Eye,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/Badge';
import { Button, Input, Select, EmptyState } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { PrintInvoiceModal, cleanPersonName } from '@/components/PrintInvoiceModal';
import { SearchableCustomerSelect } from '@/components/SearchableCustomerSelect';
import { formatAed, formatDate, todayISO } from '@/lib/format';
import { libyanCities, cityAreas, cityLabel } from '@/lib/geo';
import type { Invoice, InvoiceLine, PaymentMethod } from '@/types';

const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'نقداً',
  bank: 'تحويل بنكي',
  credit: 'آجل',
  mixed: 'نقداً + تحويل',
};

const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
  cash: <Banknote className="w-3.5 h-3.5" />,
  bank: <Building2 className="w-3.5 h-3.5" />,
  credit: <Clock className="w-3.5 h-3.5" />,
  mixed: <Banknote className="w-3.5 h-3.5" />,
};

const paymentTones: Record<PaymentMethod, 'success' | 'primary' | 'warning'> = {
  cash: 'success',
  bank: 'primary',
  credit: 'warning',
  mixed: 'primary',
};

export function Invoices() {
  const { role, currentUser, data } = useApp();
  const isAdmin = role === 'admin';
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  const availableAreas = cityFilter !== 'all' ? cityAreas(cityFilter) : [];

  // Scoped base invoices: Sales reps see only their invoices; Admin sees all
  const baseInvoices = useMemo(
    () => (isAdmin ? data.invoices : data.invoices.filter((inv) => inv.createdBy === currentUser.id)),
    [data.invoices, currentUser.id, isAdmin]
  );

  // Available drivers for admin filter
  const uniqueDrivers = useMemo(() => {
    const map = new Map<string, string>();
    data.invoices.forEach((inv) => {
      if (inv.createdBy && inv.createdByName) {
        map.set(inv.createdBy, inv.createdByName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [data.invoices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return baseInvoices.filter((inv) => {
      const matchesQ = !q || inv.number.toLowerCase().includes(q) || inv.shopName.toLowerCase().includes(q);
      const matchesS = statusFilter === 'all' || inv.status === statusFilter;
      const matchesDriver = !isAdmin || driverFilter === 'all' || inv.createdBy === driverFilter;
      const shop = data.shops.find((s) => s.id === inv.shopId);
      const matchesCity = cityFilter === 'all' || (shop?.city === cityFilter);
      const matchesArea = areaFilter === 'all' || (shop?.area === areaFilter);
      return matchesQ && matchesS && matchesDriver && matchesCity && matchesArea;
    });
  }, [baseInvoices, data.shops, query, statusFilter, driverFilter, cityFilter, areaFilter, isAdmin]);

  const totalFilteredSales = filtered.reduce((s, i) => s + i.total, 0);
  const totalFilteredCost = filtered.reduce((s, i) => s + i.totalCost, 0);
  const totalFilteredPaid = filtered.reduce((s, i) => s + i.paidAmount, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-secondary-900">{isAdmin ? 'إدارة الفواتير' : 'فواتيري ومبيعاتي'}</h2>
          <p className="text-sm text-secondary-500">
            {isAdmin ? `${data.invoices.length} فاتورة إجمالاً بالشركة` : `${baseInvoices.length} فاتورة مسجلة باسمك`}
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)} size="sm">فاتورة جديدة</Button>
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-secondary-100 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAdmin ? 'ابحث برقم الفاتورة أو اسم العميل...' : 'ابحث في فواتيرك برقم الفاتورة أو اسم المحل...'}
            className="w-full rounded-xl border-0 bg-secondary-50 pr-11 pl-4 py-2.5 text-secondary-900 placeholder:text-secondary-400 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { v: 'all', l: 'الكل' },
            { v: 'paid', l: 'مدفوعة' },
            { v: 'partial', l: 'جزئية' },
            { v: 'unpaid', l: 'آجل' },
          ].map((f) => (
            <button
              key={f.v}
              onClick={() => setStatusFilter(f.v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f.v ? 'bg-primary-600 text-white' : 'bg-secondary-50 text-secondary-600 hover:bg-secondary-100'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap pt-1 border-t border-secondary-50">
          {isAdmin && uniqueDrivers.length > 1 && (
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="rounded-xl bg-secondary-50 px-3 py-1.5 text-sm text-secondary-700 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="all">كل المناديب والسائقين</option>
              {uniqueDrivers.map((d) => (
                <option key={d.id} value={d.id}>مندوب: {d.name}</option>
              ))}
            </select>
          )}
          <select
            value={cityFilter}
            onChange={(e) => { setCityFilter(e.target.value); setAreaFilter('all'); }}
            className="rounded-xl bg-secondary-50 px-3 py-1.5 text-sm text-secondary-700 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none"
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
              className="rounded-xl bg-secondary-50 px-3 py-1.5 text-sm text-secondary-700 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="all">كل المناطق</option>
              {availableAreas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          )}
          {(cityFilter !== 'all' || areaFilter !== 'all' || driverFilter !== 'all') && (
            <button
              onClick={() => { setCityFilter('all'); setAreaFilter('all'); setDriverFilter('all'); }}
              className="px-3 py-1.5 text-sm text-secondary-500 hover:text-secondary-700 font-medium"
            >
              إلغاء الفلتر
            </button>
          )}
        </div>

        {/* Quick summary strip */}
        <div className="flex items-center justify-between text-xs text-secondary-500 pt-2 border-t border-secondary-50 flex-wrap gap-2">
          <span>المعروض: <strong>{filtered.length}</strong> فاتورة</span>
          <div className="flex items-center gap-3 flex-wrap">
            <span>إجمالي المبيعات: <strong className="text-secondary-900 tabular-nums">{formatAed(totalFilteredSales)}</strong></span>
            {isAdmin && (
              <span>رأس المال (التكلفة): <strong className="text-primary-700 tabular-nums">{formatAed(totalFilteredCost)}</strong></span>
            )}
            {isAdmin && (
              <span>الأرباح: <strong className="text-emerald-700 font-bold tabular-nums">{formatAed(totalFilteredSales - totalFilteredCost)}</strong></span>
            )}
            <span>المحصل: <strong className="text-success-600 tabular-nums">{formatAed(totalFilteredPaid)}</strong></span>
            <span>الآجل: <strong className="text-error-600 tabular-nums">{formatAed(totalFilteredSales - totalFilteredPaid)}</strong></span>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-secondary-100">
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="لا توجد فواتير"
            description="ابدأ بإنشاء فاتورة جديدة لعميل"
            action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>فاتورة جديدة</Button>}
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((inv) => (
            <div
              key={inv.id}
              onClick={() => setViewInvoice(inv)}
              className="w-full text-right rounded-2xl bg-white ring-1 ring-secondary-100 shadow-sm p-4 hover:shadow-md hover:ring-primary-200 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-secondary-900">{inv.number}</span>
                    {inv.status === 'paid' && <Badge tone="success">مدفوعة</Badge>}
                    {inv.status === 'partial' && <Badge tone="warning">جزئية</Badge>}
                    {inv.status === 'unpaid' && <Badge tone="error">آجل</Badge>}
                    <Badge tone={paymentTones[inv.paymentMethod]} icon={paymentIcons[inv.paymentMethod]}>
                      {paymentLabels[inv.paymentMethod]}
                    </Badge>
                    {inv.tripName && (
                      <Badge tone="primary" icon={<Truck className="w-3 h-3" />}>
                        سيارة: {inv.tripName}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-secondary-600 mt-1.5 truncate">{inv.shopName}</p>
                  <p className="text-xs text-secondary-400 mt-0.5">{formatDate(inv.date)} • {cleanPersonName(inv.createdByName) || 'أبوبكر دعوب'}</p>
                  {(() => { const shop = data.shops.find((s) => s.id === inv.shopId); return shop ? <p className="text-[11px] text-secondary-400 mt-0.5 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{cityLabel(shop.city)}{shop.area && ` - ${shop.area}`}</p> : null; })()}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-left">
                    <p className="text-lg font-bold text-secondary-900 tabular-nums">{formatAed(inv.total)}</p>
                    {inv.status !== 'paid' && (
                      <p className="text-xs text-error-600 font-semibold tabular-nums mt-0.5">
                        متبقي: {formatAed(inv.total - inv.paidAmount)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrintInvoice(inv);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-bold transition-all ring-1 ring-primary-200/50"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <CreateInvoiceModal
          onClose={() => setCreateOpen(false)}
          onCreated={(createdInv) => {
            setCreateOpen(false);
            setPrintInvoice(createdInv);
          }}
        />
      )}
      {viewInvoice && (
        <ViewInvoiceModal
          invoice={viewInvoice}
          onClose={() => setViewInvoice(null)}
          onPrint={() => {
            const inv = viewInvoice;
            setViewInvoice(null);
            setPrintInvoice(inv);
          }}
          isAdmin={isAdmin}
        />
      )}
      {printInvoice && (
        <PrintInvoiceModal
          invoice={printInvoice}
          shop={data.shops.find((s) => s.id === printInvoice.shopId)}
          onClose={() => setPrintInvoice(null)}
        />
      )}
    </div>
  );
}

function CreateInvoiceModal({ onClose, onCreated }: { onClose: () => void; onCreated?: (created: Invoice) => void }) {
  const { data, createInvoice, currentUser, shopBalance } = useApp();
  const [shopId, setShopId] = useState('');
  const [tripId, setTripId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [bankAmount, setBankAmount] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const activeTrips = useMemo(() => {
    return data.trips.filter((t) => t.status === 'active' || t.status === 'loading');
  }, [data.trips]);

  const selectedTrip = useMemo(() => {
    return tripId ? data.trips.find((t) => t.id === tripId) : null;
  }, [tripId, data.trips]);

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const totalCost = lines.reduce((s, l) => s + l.lineCost, 0);
  const total = Math.max(0, subtotal - discount);
  const paidTotal = (Number(cashAmount) || 0) + (Number(bankAmount) || 0);
  const balance = total - paidTotal;

  // Search items based on selected source (Car/Trip or Warehouse)
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (selectedTrip) {
      return selectedTrip.items
        .filter((ti) => {
          const rem = ti.loadedQty - ti.soldQty - ti.returnedQty;
          if (rem <= 0) return false;
          if (!q) return true;
          return ti.oem.toLowerCase().includes(q) || ti.description.toLowerCase().includes(q);
        })
        .map((ti) => {
          const rem = ti.loadedQty - ti.soldQty - ti.returnedQty;
          return {
            id: ti.itemId,
            oem: ti.oem,
            description: ti.description,
            stock: rem,
            sellPrice: ti.unitPrice,
            purchasePrice: ti.unitCost,
            isVanItem: true,
          };
        })
        .slice(0, 10);
    }

    if (!q) return [];
    return data.inventory
      .filter((i) => i.stock > 0 && (i.oem.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.carModel.toLowerCase().includes(q)))
      .slice(0, 8)
      .map((i) => ({
        id: i.id,
        oem: i.oem,
        description: i.description,
        stock: i.stock,
        sellPrice: i.sellPrice,
        purchasePrice: i.purchasePrice,
        isVanItem: false,
      }));
  }, [selectedTrip, data.inventory, search]);

  const addLine = (item: { id: string; oem: string; description: string; stock: number; sellPrice: number; purchasePrice: number }) => {
    if (lines.some((l) => l.itemId === item.id)) return;
    setLines((prev) => [
      ...prev,
      {
        itemId: item.id,
        oem: item.oem,
        description: item.description,
        qty: 1,
        unitPrice: item.sellPrice,
        unitCost: item.purchasePrice,
        lineTotal: item.sellPrice,
        lineCost: item.purchasePrice,
      },
    ]);
    setSearch('');
  };

  const updateLine = (itemId: string, patch: Partial<InvoiceLine>) =>
    setLines((prev) => prev.map((l) => {
      if (l.itemId !== itemId) return l;
      const next = { ...l, ...patch };
      next.lineTotal = next.qty * next.unitPrice;
      next.lineCost = next.qty * next.unitCost;
      return next;
    }));

  const removeLine = (itemId: string) => setLines((prev) => prev.filter((l) => l.itemId !== itemId));

  const valid = shopId && lines.length > 0;
  const shop = data.shops.find((s) => s.id === shopId);

  const handleSave = async () => {
    if (!shop || !valid || saving) return;
    setSaving(true);
    try {
      const finalPaid = paidTotal;
      let method: PaymentMethod = 'credit';
      if (cashAmount > 0 && bankAmount > 0) method = 'mixed';
      else if (cashAmount > 0) method = 'cash';
      else if (bankAmount > 0) method = 'bank';

      const status: Invoice['status'] = finalPaid >= total ? 'paid' : finalPaid > 0 ? 'partial' : 'unpaid';

      const created = await createInvoice({
        shopId: shop.id,
        shopName: shop.name,
        date,
        lines,
        subtotal,
        discount,
        total,
        totalCost,
        paymentMethod: method,
        paidAmount: finalPaid,
        cashAmount: Number(cashAmount) || 0,
        bankAmount: Number(bankAmount) || 0,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        status,
        tripId: selectedTrip?.id,
        tripName: selectedTrip ? selectedTrip.driverName : undefined,
      });

      if (onCreated) {
        onCreated(created);
      } else {
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const getItemMaxStock = (itemId: string) => {
    if (selectedTrip) {
      const ti = selectedTrip.items.find((i) => i.itemId === itemId || i.id === itemId);
      return ti ? Math.max(1, ti.loadedQty - ti.soldQty - ti.returnedQty) : 99;
    }
    const inv = data.inventory.find((i) => i.id === itemId);
    return inv ? inv.stock : 99;
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="إنشاء فاتورة جديدة"
      size="xl"
      footer={
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary-500">الإجمالي النهائي</span>
            <span className="font-bold text-secondary-900 text-lg tabular-nums">{formatAed(total)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={onClose}>إلغاء</Button>
            <Button fullWidth disabled={!valid} icon={<FileText className="w-4 h-4" />} onClick={handleSave}>
              حفظ وطباعة الفاتورة
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Source and customer selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
          <SearchableCustomerSelect
            label="العميل / المحل"
            shops={data.shops}
            selectedShopId={shopId}
            onSelectShop={setShopId}
            shopBalance={shopBalance}
          />
          <Select
            label="مصدر البضاعة (المخزن / السيارة)"
            value={tripId}
            onChange={(e) => {
              setTripId(e.target.value);
              setLines([]); // clear to avoid stock mismatch
              setSearch('');
            }}
            options={[
              { value: '', label: 'المخزن الرئيسي' },
              ...activeTrips.map((t) => ({
                value: t.id,
                label: `سيارة المندوب: ${t.driverName} (${t.city || 'جولة'})`,
              })),
            ]}
          />
          <Input label="التاريخ" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {selectedTrip && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary-50 text-primary-800 text-xs font-medium">
            <Truck className="w-4 h-4 text-primary-600 shrink-0" />
            <span>يتم البيع الآن من سيارة: <strong>{selectedTrip.driverName}</strong> — سيتم خصم الكميات من السيارة تلقائياً.</span>
          </div>
        )}

        {/* Item search */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1.5">
            {selectedTrip ? `إضافة قطع غيار من سيارة (${selectedTrip.driverName})` : 'إضافة قطع غيار من المخزن الرئيسي'}
          </label>
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={selectedTrip ? 'ابحث في بضاعة السيارة أو اختر من القائمة...' : 'ابحث برقم OEM أو الوصف في المخزن...'}
              className="w-full rounded-xl border-0 bg-secondary-50 pr-11 pl-4 py-2.5 text-secondary-900 placeholder:text-secondary-400 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 rounded-xl ring-1 ring-secondary-200 overflow-hidden divide-y divide-secondary-50 max-h-60 overflow-y-auto scrollbar-thin">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addLine(item)}
                  className="w-full text-right px-3 py-2.5 hover:bg-primary-50 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-secondary-800 truncate">{item.description}</p>
                    <p className="text-xs font-mono text-secondary-400">
                      {item.oem} • {selectedTrip ? 'متبقي بالسيارة:' : 'متوفر بالمخزن:'} <span className="font-bold text-secondary-700">{item.stock}</span>
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary-600 tabular-nums shrink-0">{formatAed(item.sellPrice)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lines */}
        {lines.length > 0 ? (
          <div className="rounded-xl ring-1 ring-secondary-200 overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-secondary-50 text-secondary-500 text-xs">
                  <tr>
                    <th className="text-right px-3 py-2 font-medium">القطعة</th>
                    <th className="text-center px-2 py-2 font-medium w-24">الكمية المباعة</th>
                    <th className="text-center px-2 py-2 font-medium w-28">سعر الوحدة</th>
                    <th className="text-center px-3 py-2 font-medium w-28">الإجمالي</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-50">
                  {lines.map((line) => {
                    const maxStock = getItemMaxStock(line.itemId);
                    return (
                      <tr key={line.itemId}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-secondary-800 text-xs truncate max-w-[160px]">{line.description}</p>
                          <p className="text-[10px] font-mono text-secondary-400">{line.oem} (متاح: {maxStock})</p>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={1}
                            max={maxStock}
                            value={line.qty}
                            onChange={(e) => updateLine(line.itemId, { qty: Math.min(Number(e.target.value), maxStock) || 1 })}
                            className="w-20 text-center rounded-lg bg-secondary-50 px-2 py-1 ring-1 ring-secondary-200 outline-none focus:ring-primary-500 tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(line.itemId, { unitPrice: Number(e.target.value) || 0 })}
                            className="w-24 text-center rounded-lg bg-secondary-50 px-2 py-1 ring-1 ring-secondary-200 outline-none focus:ring-primary-500 tabular-nums"
                          />
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-secondary-900 tabular-nums">{formatAed(line.lineTotal)}</td>
                        <td className="px-2 py-2">
                          <button onClick={() => removeLine(line.itemId)} className="text-error-400 hover:text-error-600 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-secondary-50 p-6 text-center text-secondary-400 text-sm flex flex-col items-center gap-2">
            <ShoppingCart className="w-8 h-8" />
            {selectedTrip ? `ابحث واختر قطع غيار من سيارة (${selectedTrip.driverName})` : 'ابحث وأضف قطع غيار من المخزن للفاتورة'}
          </div>
        )}

        {/* Totals & Dual Payment Fields (Cash / Bank Transfer / Split) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Input label="الخصم (د.ل)" type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            <div className="rounded-xl bg-secondary-50 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-secondary-500">المجموع الفرعي</span><span className="font-semibold tabular-nums">{formatAed(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-secondary-500">الخصم</span><span className="font-semibold tabular-nums text-error-600">-{formatAed(discount)}</span></div>
              <div className="flex justify-between border-t border-secondary-200 pt-1.5"><span className="font-bold text-secondary-700">الإجمالي المستحق</span><span className="font-bold text-primary-700 tabular-nums text-base">{formatAed(total)}</span></div>
            </div>
          </div>

          <div className="space-y-3 p-3.5 rounded-2xl bg-secondary-50 ring-1 ring-secondary-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-secondary-800">طريقة استلام الدفع من الزبون</span>
              <span className="text-xs text-secondary-400 font-medium">(كاش / تحويل / معاً)</span>
            </div>

            {/* Quick Fill Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => { setCashAmount(total); setBankAmount(0); }}
                className="px-2 py-1.5 text-[11px] font-semibold rounded-lg bg-white hover:bg-success-50 text-success-700 ring-1 ring-secondary-200 transition-colors"
              >
                كاش كامل
              </button>
              <button
                type="button"
                onClick={() => { setCashAmount(0); setBankAmount(total); }}
                className="px-2 py-1.5 text-[11px] font-semibold rounded-lg bg-white hover:bg-primary-50 text-primary-700 ring-1 ring-secondary-200 transition-colors"
              >
                تحويل كامل
              </button>
              <button
                type="button"
                onClick={() => {
                  const half = Math.round(total / 2);
                  setCashAmount(half);
                  setBankAmount(total - half);
                }}
                className="px-2 py-1.5 text-[11px] font-semibold rounded-lg bg-white hover:bg-secondary-100 text-secondary-700 ring-1 ring-secondary-200 transition-colors"
              >
                مناصفة
              </button>
              <button
                type="button"
                onClick={() => { setCashAmount(0); setBankAmount(0); }}
                className="px-2 py-1.5 text-[11px] font-semibold rounded-lg bg-white hover:bg-warning-50 text-warning-700 ring-1 ring-secondary-200 transition-colors"
              >
                آجل بالكامل
              </button>
            </div>

            {/* The 2 dedicated inputs requested by the user */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-secondary-700 mb-1 flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-success-600" />
                  <span>المدفوع نقداً (كاش - د.ل)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={cashAmount === 0 ? '' : cashAmount}
                  onChange={(e) => setCashAmount(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0 د.ل"
                  className="w-full rounded-xl border-0 bg-white px-3 py-2 text-sm text-secondary-900 placeholder:text-secondary-400 ring-1 ring-inset ring-secondary-300 focus:ring-2 focus:ring-success-500 font-semibold tabular-nums outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-primary-600" />
                  <span>المدفوع تحويل مصرفي (د.ل)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={bankAmount === 0 ? '' : bankAmount}
                  onChange={(e) => setBankAmount(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0 د.ل"
                  className="w-full rounded-xl border-0 bg-white px-3 py-2 text-sm text-secondary-900 placeholder:text-secondary-400 ring-1 ring-inset ring-secondary-300 focus:ring-2 focus:ring-primary-500 font-semibold tabular-nums outline-none"
                />
              </div>
            </div>

            {/* Live calculation feedback */}
            <div className="rounded-xl bg-white p-2.5 ring-1 ring-secondary-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-secondary-600">إجمالي المدفوع الآن:</span>
                <span className="font-bold text-secondary-900 tabular-nums">{formatAed(paidTotal)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-secondary-100">
                <span className="text-secondary-600">المتبقي (آجل على حساب الزبون):</span>
                <span className={`font-bold tabular-nums ${balance > 0 ? 'text-error-600 text-sm' : 'text-success-600'}`}>
                  {balance > 0 ? formatAed(balance) : 'خالص بالكامل (0 د.ل)'}
                </span>
              </div>
              {paidTotal > total && (
                <p className="text-[11px] text-warning-700 font-medium pt-1">
                  * تنبيه: إجمالي المدفوع أكبر من قيمة الفاتورة بمقدار {formatAed(paidTotal - total)}.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ViewInvoiceModal({ invoice, onClose, onPrint, isAdmin }: { invoice: Invoice; onClose: () => void; onPrint?: () => void; isAdmin: boolean }) {
  return (
    <Modal
      open
      onClose={onClose}
      title={`فاتورة ${invoice.number}`}
      size="lg"
      footer={
        <div className="flex gap-2 w-full">
          {onPrint && (
            <Button variant="primary" icon={<Printer className="w-4 h-4" />} onClick={onPrint} className="flex-1">
              طباعة الفاتورة
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} className="px-5">
            إغلاق
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs text-secondary-400">العميل</p>
            <p className="font-bold text-secondary-900">{invoice.shopName}</p>
            <p className="text-xs text-secondary-500 mt-1">{formatDate(invoice.date)}</p>
            {invoice.tripName && (
              <p className="text-xs font-medium text-primary-700 mt-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" />
                المصدر: سيارة {invoice.tripName}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge tone={paymentTones[invoice.paymentMethod]} icon={paymentIcons[invoice.paymentMethod]}>
                {paymentLabels[invoice.paymentMethod]}
              </Badge>
              {invoice.status === 'paid' && <Badge tone="success">مدفوعة بالكامل</Badge>}
              {invoice.status === 'partial' && <Badge tone="warning">دفعة جزئية</Badge>}
              {invoice.status === 'unpaid' && <Badge tone="error">غير مدفوعة</Badge>}
            </div>
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg transition-colors border border-primary-200"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>معاينة وطباعة</span>
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl ring-1 ring-secondary-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 text-secondary-500 text-xs">
              <tr>
                <th className="text-right px-3 py-2 font-medium">القطعة</th>
                <th className="text-center px-2 py-2 font-medium">كمية</th>
                <th className="text-center px-2 py-2 font-medium">السعر</th>
                <th className="text-center px-3 py-2 font-medium">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-50">
              {invoice.lines.map((line) => (
                <tr key={line.itemId}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-secondary-800 text-xs">{line.description}</p>
                    <p className="text-[10px] font-mono text-secondary-400">{line.oem}</p>
                  </td>
                  <td className="text-center tabular-nums">{line.qty}</td>
                  <td className="text-center tabular-nums">{formatAed(line.unitPrice)}</td>
                  <td className="text-center font-bold tabular-nums">{formatAed(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-secondary-50 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-secondary-500">المجموع الفرعي</span><span className="font-semibold tabular-nums">{formatAed(invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-secondary-500">الخصم</span><span className="font-semibold tabular-nums text-error-600">-{formatAed(invoice.discount)}</span></div>
            <div className="flex justify-between border-t border-secondary-200 pt-1.5"><span className="font-bold text-secondary-700">الإجمالي النهائي</span><span className="font-bold text-primary-700 tabular-nums">{formatAed(invoice.total)}</span></div>
            
            {(invoice.cashAmount ?? 0) > 0 && (
              <div className="flex justify-between text-xs text-secondary-600">
                <span className="flex items-center gap-1"><Banknote className="w-3 h-3 text-success-600" /> مدفوع نقداً (كاش)</span>
                <span className="font-semibold tabular-nums text-success-700">{formatAed(invoice.cashAmount!)}</span>
              </div>
            )}

            {(invoice.bankAmount ?? 0) > 0 && (
              <div className="flex justify-between text-xs text-secondary-600">
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-primary-600" /> مدفوع تحويل مصرفي</span>
                <span className="font-semibold tabular-nums text-primary-700">{formatAed(invoice.bankAmount!)}</span>
              </div>
            )}

            <div className="flex justify-between border-t border-secondary-100 pt-1">
              <span className="text-secondary-600 font-medium">إجمالي المدفوع</span>
              <span className="font-semibold tabular-nums text-success-600">{formatAed(invoice.paidAmount)}</span>
            </div>
            {invoice.total - invoice.paidAmount > 0 && (
              <div className="flex justify-between"><span className="text-secondary-500">المتبقي (آجل)</span><span className="font-bold tabular-nums text-error-600">{formatAed(invoice.total - invoice.paidAmount)}</span></div>
            )}
          </div>
          {isAdmin && (
            <div className="rounded-xl bg-primary-50 p-3 ring-1 ring-primary-100 space-y-1.5 text-sm">
              <p className="font-bold text-primary-800 text-xs mb-1">تفاصيل الإدارة (سرّي)</p>
              <div className="flex justify-between"><span className="text-primary-600">تكلفة البضاعة</span><span className="font-semibold tabular-nums text-primary-800">{formatAed(invoice.totalCost)}</span></div>
              <div className="flex justify-between"><span className="text-primary-600">صافي الربح</span><span className="font-bold tabular-nums text-success-700">{formatAed(invoice.total - invoice.totalCost)}</span></div>
              <div className="flex justify-between"><span className="text-primary-600">أنشأها</span><span className="font-semibold text-primary-800">{cleanPersonName(invoice.createdByName) || 'أبوبكر دعوب'}</span></div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
