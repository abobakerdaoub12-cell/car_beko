import { useMemo } from 'react';
import { DollarSign, FileText, TrendingUp, ShoppingCart, Calendar, Award, Coins } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Form';
import { formatAed, formatDate } from '@/lib/format';

export function MySales() {
  const { data, currentUser, role } = useApp();
  const isAdmin = role === 'admin';

  // For sales rep: show only their invoices. For admin viewing this page: show all
  const myInvoices = useMemo(
    () => (isAdmin ? data.invoices : data.invoices.filter((i) => i.createdBy === currentUser.id)),
    [data.invoices, currentUser.id, isAdmin],
  );

  const totalSales = myInvoices.reduce((s, i) => s + i.total, 0);
  const totalCost = myInvoices.reduce((s, i) => s + i.totalCost, 0);
  const totalProfit = totalSales - totalCost;
  const totalItems = myInvoices.reduce((s, i) => s + i.lines.reduce((a, l) => a + l.qty, 0), 0);
  const paidTotal = myInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const unpaidTotal = myInvoices.reduce((s, i) => s + (i.total - i.paidAmount), 0);

  // Top selling items by qty
  const itemStats = useMemo(() => {
    const map = new Map<string, { oem: string; desc: string; qty: number; revenue: number }>();
    myInvoices.forEach((inv) => {
      inv.lines.forEach((l) => {
        const ex = map.get(l.itemId);
        if (ex) {
          ex.qty += l.qty;
          ex.revenue += l.lineTotal;
        } else {
          map.set(l.itemId, { oem: l.oem, desc: l.description, qty: l.qty, revenue: l.lineTotal });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [myInvoices]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-secondary-900">{isAdmin ? 'إحصائيات المبيعات' : 'مبيعاتي الشخصية'}</h2>
        <p className="text-sm text-secondary-500">
          {isAdmin ? 'عرض جميع المبيعات' : `${currentUser.name}`}
        </p>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl bg-gradient-to-l from-success-600 to-success-500 p-5 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-success-100 text-sm flex items-center gap-2">
            <Award className="w-4 h-4" />
            {isAdmin ? 'إجمالي المبيعات' : 'إجمالي مبيعاتي'}
          </p>
          <p className="text-3xl font-bold mt-1 tabular-nums">{formatAed(totalSales)}</p>
          <p className="text-success-100 text-sm mt-1">{myInvoices.length} فاتورة • {totalItems} قطعة مباعة</p>
        </div>
      </div>

      <div className={`grid grid-cols-2 ${isAdmin ? 'sm:grid-cols-3 lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3`}>
        {isAdmin && (
          <StatCard label="رأس المال (التكلفة)" value={formatAed(totalCost)} icon={<Coins className="w-5 h-5" />} tone="secondary" />
        )}
        {isAdmin && (
          <StatCard label="صافي الأرباح" value={formatAed(totalProfit)} icon={<TrendingUp className="w-5 h-5" />} tone="accent" />
        )}
        <StatCard label="عدد الفواتير" value={String(myInvoices.length)} icon={<FileText className="w-5 h-5" />} tone="primary" />
        <StatCard label="القطع المباعة" value={String(totalItems)} icon={<ShoppingCart className="w-5 h-5" />} tone="accent" />
        <StatCard label="المحصّل" value={formatAed(paidTotal)} icon={<DollarSign className="w-5 h-5" />} tone="success" />
        <StatCard label="الآجل المتبقي" value={formatAed(unpaidTotal)} icon={<TrendingUp className="w-5 h-5" />} tone="warning" />
      </div>

      {/* Top items */}
      {itemStats.length > 0 && (
        <div className="rounded-2xl bg-white ring-1 ring-secondary-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-secondary-100">
            <h3 className="font-bold text-secondary-900 text-sm">الأكثر مبيعاً</h3>
          </div>
          <div className="divide-y divide-secondary-50">
            {itemStats.map((item, idx) => (
              <div key={item.oem} className="px-4 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-secondary-800 truncate">{item.desc}</p>
                  <p className="text-xs font-mono text-secondary-400">{item.oem}</p>
                </div>
                <div className="text-left shrink-0">
                  <p className="text-sm font-bold text-secondary-900 tabular-nums">{item.qty} قطعة</p>
                  <p className="text-xs text-success-600 tabular-nums">{formatAed(item.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice list */}
      <div className="rounded-2xl bg-white ring-1 ring-secondary-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-secondary-100">
          <h3 className="font-bold text-secondary-900 text-sm">فواتيري الأخيرة</h3>
        </div>
        {myInvoices.length === 0 ? (
          <EmptyState icon={<FileText className="w-8 h-8" />} title="لا توجد فواتير بعد" description="ابدأ بإنشاء فاتورة من صفحة الفواتير" />
        ) : (
          <div className="divide-y divide-secondary-50">
            {myInvoices.slice(0, 10).map((inv) => (
              <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-secondary-800">{inv.number}</span>
                    {inv.status === 'paid' && <Badge tone="success">مدفوعة</Badge>}
                    {inv.status === 'partial' && <Badge tone="warning">جزئية</Badge>}
                    {inv.status === 'unpaid' && <Badge tone="error">آجل</Badge>}
                  </div>
                  <p className="text-xs text-secondary-500 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(inv.date)} • {inv.shopName}
                  </p>
                </div>
                <span className="text-sm font-bold text-secondary-900 tabular-nums shrink-0">{formatAed(inv.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
