import { useMemo, useState } from 'react';
import { Search, Package, Plus, Edit2, Trash2, Boxes, X, AlertTriangle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/Badge';
import { Button, Input, Select, EmptyState } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { formatAed } from '@/lib/format';
import type { InventoryItem } from '@/types';

export function Inventory() {
  const { role, data, addInventoryItem, updateInventoryItem, deleteInventoryItem, clearAllInventory } = useApp();
  const isAdmin = role === 'admin';

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    data.inventory.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [data.inventory]);

  const filtered = useMemo(() => {
    return data.inventory.filter((item) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.oem.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.carModel.toLowerCase().includes(q);

      const matchesCat = category === 'all' || item.category === category;
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'low' && item.stock <= item.minStock && item.stock > 0) ||
        (stockFilter === 'out' && item.stock === 0) ||
        (stockFilter === 'available' && item.stock > item.minStock);

      return matchesQuery && matchesCat && matchesStock;
    });
  }, [data.inventory, query, category, stockFilter]);

  const totalUnits = data.inventory.reduce((s, i) => s + i.stock, 0);
  const totalCostValue = data.inventory.reduce((s, i) => s + i.stock * i.purchasePrice, 0);
  const totalSellValue = data.inventory.reduce((s, i) => s + i.stock * i.sellPrice, 0);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setModalOpen(true);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header stats bar */}
      <div className="bg-white rounded-2xl p-4 ring-1 ring-secondary-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-secondary-900">إدارة المخزون وقطع الغيار</h2>
          <p className="text-xs text-secondary-400">
            إجمالي الأصناف: {data.inventory.length} صنف • {totalUnits.toLocaleString('en-US')} قطعة
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isAdmin && (
            <div className="hidden md:flex items-center gap-4 text-xs pl-4 border-l border-secondary-100">
              <div>
                <span className="text-secondary-400 block">قيمة التكلفة</span>
                <span className="font-bold text-secondary-900 tabular-nums">{formatAed(totalCostValue)}</span>
              </div>
              <div>
                <span className="text-secondary-400 block">قيمة البيع</span>
                <span className="font-bold text-primary-600 tabular-nums">{formatAed(totalSellValue)}</span>
              </div>
            </div>
          )}
          {isAdmin && data.inventory.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => setClearAllModalOpen(true)}
              className="text-error-600 hover:text-error-700 hover:bg-error-50 border-error-200"
              icon={<Trash2 className="w-4 h-4" />}
            >
              مسح كافة البضاعة
            </Button>
          )}
          {isAdmin && (
            <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>
              إضافة صنف جديد
            </Button>
          )}
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1">
          <Input
            placeholder="بحث برقم OEM، اسم القطعة، الموديل..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: 'all', label: 'جميع التصنيفات' },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
        <div>
          <Select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            options={[
              { value: 'all', label: 'حالة المخزون (الكل)' },
              { value: 'available', label: 'متوفر كافي' },
              { value: 'low', label: 'منخفض (أقل من الحد الأدنى)' },
              { value: 'out', label: 'نفد من المخزن' },
            ]}
          />
        </div>
      </div>

      {/* Items list / table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title={data.inventory.length === 0 ? 'المخزون فارغ حالياً' : 'لا توجد أصناف تطابق البحث'}
          description={
            data.inventory.length === 0
              ? 'تم تفريغ البضاعة التجريبية بنجاح. يمكنك الآن البدء بإضافة قطع الغيار والأصناف الخاصة بك.'
              : 'جرّب تعديل كلمات البحث أو تصفية الفئات'
          }
          action={isAdmin ? <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>إضافة صنف جديد</Button> : undefined}
        />
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-secondary-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-secondary-50 text-secondary-600 text-xs font-semibold border-b border-secondary-100">
                <tr>
                  <th className="px-4 py-3">رقم القطعة (OEM)</th>
                  <th className="px-4 py-3">الوصف والموديل</th>
                  <th className="px-4 py-3">التصنيف</th>
                  <th className="px-4 py-3 text-center">الكمية بالمخزن</th>
                  {isAdmin && <th className="px-4 py-3">سعر الشراء</th>}
                  <th className="px-4 py-3">سعر البيع</th>
                  {isAdmin && <th className="px-4 py-3 text-left">إجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {filtered.map((item) => {
                  const isLow = item.stock <= item.minStock && item.stock > 0;
                  const isOut = item.stock === 0;

                  return (
                    <tr key={item.id} className="hover:bg-secondary-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-secondary-900 text-xs sm:text-sm">
                        {item.oem}
                      </td>
                      <td className="px-4 py-3 min-w-[200px]">
                        <p className="font-semibold text-secondary-900 leading-tight">{item.description}</p>
                        <p className="text-xs text-secondary-400 mt-0.5">{item.carModel}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-secondary-700 font-medium">{item.category}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <Badge tone={isOut ? 'error' : isLow ? 'warning' : 'success'}>
                            {item.stock} قطعة
                          </Badge>
                          {isLow && (
                            <span className="text-[10px] text-warning-600 mt-0.5 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> حد أدنى {item.minStock}
                            </span>
                          )}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-secondary-600 font-medium tabular-nums">
                          {formatAed(item.purchasePrice)}
                        </td>
                      )}
                      <td className="px-4 py-3 font-bold text-primary-700 tabular-nums">
                        {formatAed(item.sellPrice)}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-left">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(item.id)}
                              className="p-1.5 rounded-lg text-secondary-400 hover:text-error-600 hover:bg-error-50 transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <InventoryModal
          open={modalOpen}
          item={editing}
          onClose={() => setModalOpen(false)}
          onSave={async (val) => {
            if (editing) {
              await updateInventoryItem(editing.id, val);
            } else {
              await addInventoryItem(val);
            }
            setModalOpen(false);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal
          open={Boolean(deleteId)}
          onClose={() => setDeleteId(null)}
          title="تأكيد حذف الصنف"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteId(null)}>إلغاء</Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (deleteId) await deleteInventoryItem(deleteId);
                  setDeleteId(null);
                }}
              >
                تأكيد الحذف
              </Button>
            </div>
          }
        >
          <p className="text-sm text-secondary-600">هل أنت متأكد من حذف هذا الصنف من المخزون نهائياً؟</p>
        </Modal>
      )}

      {/* Clear All Confirmation Modal */}
      {clearAllModalOpen && (
        <Modal
          open={clearAllModalOpen}
          onClose={() => !isClearing && setClearAllModalOpen(false)}
          title="تأكيد مسح كافة بضاعة المخزون"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" disabled={isClearing} onClick={() => setClearAllModalOpen(false)}>إلغاء</Button>
              <Button
                variant="danger"
                disabled={isClearing}
                onClick={async () => {
                  setIsClearing(true);
                  try {
                    await clearAllInventory();
                    setClearAllModalOpen(false);
                  } finally {
                    setIsClearing(false);
                  }
                }}
              >
                {isClearing ? 'جاري المسح...' : 'نعم، مسح كافة البضاعة'}
              </Button>
            </div>
          }
        >
          <div className="space-y-2">
            <p className="text-sm text-secondary-700 font-semibold">هل أنت متأكد من رغبتك في مسح كافة الأصناف والبضاعة التجريبية من المخزون؟</p>
            <p className="text-xs text-error-600">سيتم تصفير جدول المخزون بالكامل وحذف جميع الأصناف لتتمكن من البدء بإضافة بضاعتك الفعلية.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InventoryModal({
  open,
  item,
  onClose,
  onSave,
}: {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (val: Omit<InventoryItem, 'id'>) => Promise<void>;
}) {
  const [oem, setOem] = useState(item?.oem || '');
  const [description, setDescription] = useState(item?.description || '');
  const [carModel, setCarModel] = useState(item?.carModel || '');
  const [category, setCategory] = useState(item?.category || 'فرامل');
  const [stock, setStock] = useState(item?.stock ? String(item.stock) : '0');
  const [minStock, setMinStock] = useState(item?.minStock ? String(item.minStock) : '5');
  const [purchasePrice, setPurchasePrice] = useState(item?.purchasePrice ? String(item.purchasePrice) : '0');
  const [sellPrice, setSellPrice] = useState(item?.sellPrice ? String(item.sellPrice) : '0');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oem.trim() || !description.trim()) return;
    setBusy(true);
    try {
      await onSave({
        oem: oem.trim(),
        description: description.trim(),
        carModel: carModel.trim(),
        category: category.trim(),
        shelf: item?.shelf || '',
        stock: Number(stock) || 0,
        minStock: Number(minStock) || 0,
        purchasePrice: Number(purchasePrice) || 0,
        sellPrice: Number(sellPrice) || 0,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد للمخزون'}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? 'جارٍ الحفظ...' : item ? 'حفظ التعديلات' : 'إضافة الصنف'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="رقم القطعة الأصلي (OEM) *"
            required
            value={oem}
            onChange={(e) => setOem(e.target.value)}
            placeholder="مثال: 04465-33450"
          />
          <Input
            label="اسم ووصف القطعة *"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="مثال: طقم فحمات فرامل أمامية"
          />
          <Input
            label="موديل ونوع السيارات المناسبة"
            value={carModel}
            onChange={(e) => setCarModel(e.target.value)}
            placeholder="مثال: Toyota Camry 2018-2023"
          />
          <Input
            label="التصنيف"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="مثال: فرامل، فلاتر، محرك، عفشة..."
          />
          <Input
            label="الكمية المتوفرة حالياً"
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
          <Input
            label="الحد الأدنى للتنبيه"
            type="number"
            min="0"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
          />
          <Input
            label="سعر التكلفة / الشراء (د.ل)"
            type="number"
            step="0.01"
            min="0"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
          />
          <Input
            label="سعر البيع للجملة (د.ل) *"
            type="number"
            step="0.01"
            min="0"
            required
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
