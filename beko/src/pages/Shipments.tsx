import { useState } from 'react';
import {
  Ship, Plus, Trash2, Calculator, Calendar, Package, TrendingUp,
  MapPin, Clock, CheckCircle2, Edit2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/Badge';
import { Button, Input, Select, EmptyState } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { formatAed, formatDate, daysBetween } from '@/lib/format';
import type { Shipment } from '@/types';

const statusMap: Record<Shipment['status'], { label: string; tone: 'warning' | 'primary' | 'success'; icon: React.ReactNode }> = {
  in_transit: { label: 'في الطريق', tone: 'warning', icon: <Clock className="w-3 h-3" /> },
  arrived: { label: 'وصلت', tone: 'primary', icon: <MapPin className="w-3 h-3" /> },
  cleared: { label: 'تم التخليص', tone: 'success', icon: <CheckCircle2 className="w-3 h-3" /> },
};

export function Shipments() {
  const { data, addShipment, updateShipment, deleteShipment } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shipment | null>(null);
  const [calcShipment, setCalcShipment] = useState<Shipment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (s: Shipment) => { setEditing(s); setModalOpen(true); };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-secondary-900">شحنات الصين</h2>
          <p className="text-sm text-secondary-500">تتبع حاويات الشحن وحساب التكلفة النهائية</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={openAdd} size="sm">شحنة جديدة</Button>
      </div>

      {data.shipments.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-secondary-100">
          <EmptyState
            icon={<Ship className="w-8 h-8" />}
            title="لا توجد شحنات"
            description="أضف شحنة جديدة لتتبع التكلفة وهامش الربح"
            action={<Button icon={<Plus className="w-4 h-4" />} onClick={openAdd}>إضافة شحنة</Button>}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {data.shipments.map((s) => {
            const st = statusMap[s.status];
            const totalCny = s.totalCostCny + s.totalShippingCny;
            const totalLyd = totalCny * s.cnyToLydRate;
            const perItem = s.itemCount > 0 ? totalLyd / s.itemCount : 0;
            const shippingPerItem = s.itemCount > 0 ? (s.totalShippingCny * s.cnyToLydRate) / s.itemCount : 0;
            const daysLeft = daysBetween(new Date().toISOString().slice(0, 10), s.arrivalDate);
            const linkedItems = data.inventory.filter((i) => i.shipmentId === s.id);

            return (
              <div key={s.id} className="rounded-2xl bg-white ring-1 ring-secondary-100 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-accent-50 flex items-center justify-center text-accent-600 shrink-0">
                        <Ship className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-secondary-900">{s.ref}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge tone={st.tone} icon={st.icon}>{st.label}</Badge>
                          {s.status === 'in_transit' && daysLeft > 0 && (
                            <span className="text-xs text-secondary-400">يصل خلال {daysLeft} يوم</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="text-secondary-500" icon={<Calculator className="w-4 h-4" />} onClick={() => setCalcShipment(s)}>
                        حساب
                      </Button>
                      <Button variant="ghost" size="sm" className="text-secondary-400" onClick={() => openEdit(s)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-error-500 hover:bg-error-50" onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div className="rounded-xl bg-secondary-50 px-3 py-2">
                      <p className="text-[10px] text-secondary-400">تكلفة الشراء</p>
                      <p className="font-semibold text-secondary-800 tabular-nums">{s.totalCostCny.toLocaleString('en-US')} يوان</p>
                    </div>
                    <div className="rounded-xl bg-secondary-50 px-3 py-2">
                      <p className="text-[10px] text-secondary-400">الشحن والجمارك</p>
                      <p className="font-semibold text-secondary-800 tabular-nums">{s.totalShippingCny.toLocaleString('en-US')} يوان</p>
                    </div>
                    <div className="rounded-xl bg-secondary-50 px-3 py-2">
                      <p className="text-[10px] text-secondary-400">سعر الصرف</p>
                      <p className="font-semibold text-secondary-800 tabular-nums">{s.cnyToLydRate.toFixed(2)}</p>
                    </div>
                    <div className="rounded-xl bg-primary-50 px-3 py-2">
                      <p className="text-[10px] text-primary-500">التكلفة الإجمالية</p>
                      <p className="font-bold text-primary-700 tabular-nums">{formatAed(totalLyd)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-secondary-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      مغادرة: {formatDate(s.departureDate)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      وصول: {formatDate(s.arrivalDate)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      {s.itemCount.toLocaleString('en-US')} قطعة
                    </span>
                    {linkedItems.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-primary-600">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {linkedItems.length} قطعة مرتبطة بالمخزون
                      </span>
                    )}
                  </div>
                </div>

                {/* Landed cost breakdown bar */}
                <div className="bg-secondary-50/50 px-4 py-2.5 border-t border-secondary-50 flex items-center justify-between text-sm">
                  <span className="text-secondary-500">التكلفة المتوطّنة للقطعة الواحدة</span>
                  <span className="font-bold text-secondary-800 tabular-nums">
                    {formatAed(perItem)}
                    <span className="text-xs font-normal text-secondary-400 mr-1">
                      (شحن: {formatAed(shippingPerItem)})
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <ShipmentModal
          shipment={editing}
          onClose={() => setModalOpen(false)}
          onSave={(payload) => {
            if (editing) updateShipment(editing.id, payload);
            else addShipment(payload);
            setModalOpen(false);
          }}
        />
      )}

      {calcShipment && (
        <CalcModal shipment={calcShipment} linkedItems={data.inventory.filter((i) => i.shipmentId === calcShipment.id)} onClose={() => setCalcShipment(null)} />
      )}

      {deleteId && (
        <Modal
          open
          onClose={() => setDeleteId(null)}
          title="تأكيد الحذف"
          size="sm"
          footer={
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={() => setDeleteId(null)}>إلغاء</Button>
              <Button variant="danger" fullWidth onClick={() => { deleteShipment(deleteId); setDeleteId(null); }}>حذف</Button>
            </div>
          }
        >
          <p className="text-sm text-secondary-600">سيتم حذف الشحنة. القطع المرتبطة بها في المخزون لن تُحذف.</p>
        </Modal>
      )}
    </div>
  );
}

function ShipmentModal({ shipment, onClose, onSave }: { shipment: Shipment | null; onClose: () => void; onSave: (p: Omit<Shipment, 'id'>) => void }) {
  const [form, setForm] = useState({
    ref: shipment?.ref ?? '',
    departureDate: shipment?.departureDate ?? '',
    arrivalDate: shipment?.arrivalDate ?? '',
    status: shipment?.status ?? 'in_transit',
    totalCostCny: shipment?.totalCostCny ?? 0,
    totalShippingCny: shipment?.totalShippingCny ?? 0,
    cnyToLydRate: shipment?.cnyToLydRate ?? 6.8,
    itemCount: shipment?.itemCount ?? 0,
  });
  const set = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.ref && form.departureDate && form.arrivalDate && form.itemCount > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={shipment ? 'تعديل شحنة' : 'شحنة جديدة'}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={onClose}>إلغاء</Button>
          <Button fullWidth disabled={!valid} onClick={() => onSave(form)}>حفظ</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="رقم/مرجع الشحنة" value={form.ref} onChange={(e) => set('ref', e.target.value)} placeholder="CN-2026-001" />
        <Select
          label="الحالة"
          value={form.status}
          onChange={(e) => set('status', e.target.value as Shipment['status'])}
          options={[
            { value: 'in_transit', label: 'في الطريق' },
            { value: 'arrived', label: 'وصلت' },
            { value: 'cleared', label: 'تم التخليص' },
          ]}
        />
        <Input label="تاريخ المغادرة" type="date" value={form.departureDate} onChange={(e) => set('departureDate', e.target.value)} />
        <Input label="تاريخ الوصول" type="date" value={form.arrivalDate} onChange={(e) => set('arrivalDate', e.target.value)} />
        <Input label="تكلفة الشراء (يوان)" type="number" min={0} value={form.totalCostCny} onChange={(e) => set('totalCostCny', Number(e.target.value))} />
        <Input label="الشحن والجمارك (يوان)" type="number" min={0} value={form.totalShippingCny} onChange={(e) => set('totalShippingCny', Number(e.target.value))} />
        <Input label="سعر صرف اليوان/الدينار" type="number" min={0} step="0.01" value={form.cnyToLydRate} onChange={(e) => set('cnyToLydRate', Number(e.target.value))} />
        <Input label="عدد القطع" type="number" min={1} value={form.itemCount} onChange={(e) => set('itemCount', Number(e.target.value))} />
      </div>
    </Modal>
  );
}

function CalcModal({ shipment, linkedItems, onClose }: { shipment: Shipment; linkedItems: { id: string; oem: string; description: string; sellPrice: number; purchasePrice: number }[]; onClose: () => void }) {
  const totalCny = shipment.totalCostCny + shipment.totalShippingCny;
  const totalLyd = totalCny * shipment.cnyToLydRate;
  const perItem = shipment.itemCount > 0 ? totalLyd / shipment.itemCount : 0;
  const purchasePerItem = shipment.itemCount > 0 ? (shipment.totalCostCny * shipment.cnyToLydRate) / shipment.itemCount : 0;
  const shippingPerItem = shipment.itemCount > 0 ? (shipment.totalShippingCny * shipment.cnyToLydRate) / shipment.itemCount : 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={`حاسبة التكلفة المتوطّنة - ${shipment.ref}`}
      size="lg"
      footer={<Button variant="secondary" fullWidth onClick={onClose}>إغلاق</Button>}
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-secondary-50 p-4 space-y-3">
          <h4 className="font-bold text-secondary-800 text-sm flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary-600" />
            تفصيل التكلفة
          </h4>
          <div className="space-y-2 text-sm">
            <Row label="تكلفة الشراء (يوان)" value={`${shipment.totalCostCny.toLocaleString('en-US')} يوان`} />
            <Row label="الشحن + الجمارك (يوان)" value={`${shipment.totalShippingCny.toLocaleString('en-US')} يوان`} />
            <Row label="الإجمالي (يوان)" value={`${totalCny.toLocaleString('en-US')} يوان`} />
            <Row label="سعر الصرف" value={shipment.cnyToLydRate.toFixed(3)} />
            <div className="border-t border-secondary-200 pt-2">
              <Row label="الإجمالي بالدينار" value={formatAed(totalLyd)} bold />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-primary-50 p-4 ring-1 ring-primary-100">
          <h4 className="font-bold text-primary-800 text-sm mb-3">التكلفة لكل قطعة</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 ring-1 ring-primary-100">
              <p className="text-xs text-secondary-500">سعر الشراء/قطعة</p>
              <p className="text-lg font-bold text-secondary-800 tabular-nums">{formatAed(purchasePerItem)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 ring-1 ring-primary-100">
              <p className="text-xs text-secondary-500">الشحن المخصص/قطعة</p>
              <p className="text-lg font-bold text-secondary-800 tabular-nums">{formatAed(shippingPerItem)}</p>
            </div>
            <div className="bg-primary-600 rounded-xl p-3 text-white">
              <p className="text-xs text-primary-100">التكلفة النهائية/قطعة</p>
              <p className="text-lg font-bold tabular-nums">{formatAed(perItem)}</p>
            </div>
          </div>
        </div>

        {linkedItems.length > 0 && (
          <div className="rounded-2xl bg-white ring-1 ring-secondary-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-secondary-100">
              <h4 className="font-bold text-secondary-800 text-sm">هوامش الربح للقطع المرتبطة</h4>
              <p className="text-xs text-secondary-400">يستخدم سعر التكلفة المسجل في المخزون</p>
            </div>
            <div className="divide-y divide-secondary-50">
              {linkedItems.map((item) => {
                const profit = item.sellPrice - item.purchasePrice;
                const margin = item.sellPrice > 0 ? (profit / item.sellPrice) * 100 : 0;
                return (
                  <div key={item.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-secondary-800 truncate">{item.description}</p>
                      <p className="text-xs font-mono text-secondary-400">{item.oem}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm shrink-0">
                      <div className="text-center">
                        <p className="text-[10px] text-secondary-400">تكلفة</p>
                        <p className="font-semibold text-secondary-700 tabular-nums">{formatAed(item.purchasePrice)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-secondary-400">بيع</p>
                        <p className="font-semibold text-primary-600 tabular-nums">{formatAed(item.sellPrice)}</p>
                      </div>
                      <div className="text-center min-w-16">
                        <p className="text-[10px] text-secondary-400">ربح</p>
                        <p className={`font-bold tabular-nums ${profit >= 0 ? 'text-success-600' : 'text-error-600'}`}>{formatAed(profit)}</p>
                        <p className={`text-[10px] tabular-nums ${margin >= 0 ? 'text-success-500' : 'text-error-500'}`}>{margin.toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-secondary-500">{label}</span>
      <span className={`tabular-nums ${bold ? 'font-bold text-primary-700 text-base' : 'font-semibold text-secondary-800'}`}>{value}</span>
    </div>
  );
}
