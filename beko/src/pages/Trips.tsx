import { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  X,
  Trash2,
  Package,
  Pencil,
  MapPin,
  Calendar,
  Boxes,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Car,
  AlertTriangle,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/Badge';
import { Button, Input, EmptyState } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { formatAed, formatDate, todayISO } from '@/lib/format';
import type { Trip, TripItem, TripStatus } from '@/types';

export function Trips() {
  const { role, currentUser, data, createTrip, approveTrip, rejectTrip, deleteTrip } = useApp();
  const isAdmin = role === 'admin';
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTripId, setViewTripId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const baseTrips = isAdmin
    ? data.trips
    : data.trips.filter(
        (t) =>
          t.createdBy === currentUser.id ||
          t.driverName.toLowerCase().includes(currentUser.name.toLowerCase()) ||
          t.createdByName === currentUser.name
      );

  const pendingApprovalCount = data.trips.filter((t) => t.status === 'pending_approval').length;

  const filtered = baseTrips.filter((t) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      t.driverName.toLowerCase().includes(q) ||
      t.city.toLowerCase().includes(q) ||
      t.area.toLowerCase().includes(q) ||
      t.vehicle.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const statusTone: Record<TripStatus, 'primary' | 'success' | 'warning' | 'error'> = {
    pending_approval: 'warning',
    loading: 'warning',
    active: 'primary',
    completed: 'success',
    cancelled: 'error',
    rejected: 'error',
  };

  const statusLabel: Record<TripStatus, string> = {
    pending_approval: 'بانتظار موافقة الإدارة',
    loading: 'قيد التحميل',
    active: 'جارية',
    completed: 'مكتملة',
    cancelled: 'ملغاة',
    rejected: 'مرفوضة',
  };

  const statusIcon: Record<TripStatus, React.ReactNode> = {
    pending_approval: <Clock className="w-3.5 h-3.5" />,
    loading: <Boxes className="w-3.5 h-3.5" />,
    active: <Truck className="w-3.5 h-3.5" />,
    completed: <CheckCircle2 className="w-3.5 h-3.5" />,
    cancelled: <XCircle className="w-3.5 h-3.5" />,
    rejected: <XCircle className="w-3.5 h-3.5" />,
  };

  const handleApprove = async (tripId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await approveTrip(tripId);
      setApprovingId(null);
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
      setRejectingId(null);
      setRejectReason('');
    } catch (e: any) {
      setActionError(e?.message || 'فشل رفض الطلب');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Admin notification banner for pending approval requests */}
      {isAdmin && pendingApprovalCount > 0 && statusFilter !== 'pending_approval' && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">
                يوجد {pendingApprovalCount} {pendingApprovalCount === 1 ? 'طلب جولة وبضاعة' : 'طلبات جولات'} بانتظار موافقة الإدارة
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                قام المندوب بطلب جولة وتحديد البضاعة المطلوبة من المخزن. يلزم موافقتك لصرف البضاعة وتفعيل الجولة.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('pending_approval')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shrink-0 shadow-sm"
          >
            عرض الطلبات المعلقة ({pendingApprovalCount})
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="rounded-2xl bg-white ring-1 ring-secondary-100 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم المندوب / السائق، السيارة، المدينة..."
            className="w-full rounded-xl border-0 bg-secondary-50 pr-11 pl-4 py-3 text-secondary-900 placeholder:text-secondary-400 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-2 flex-wrap items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl bg-secondary-50 px-3 py-2 text-sm font-semibold text-secondary-700 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="all">كل الحالات ({baseTrips.length})</option>
              <option value="pending_approval">⏳ بانتظار الموافقة ({baseTrips.filter((t) => t.status === 'pending_approval').length})</option>
              <option value="active">🟢 جارية ({baseTrips.filter((t) => t.status === 'active').length})</option>
              <option value="loading">📦 قيد التحميل ({baseTrips.filter((t) => t.status === 'loading').length})</option>
              <option value="completed">✅ مكتملة ({baseTrips.filter((t) => t.status === 'completed').length})</option>
              <option value="rejected">❌ مرفوضة ({baseTrips.filter((t) => t.status === 'rejected').length})</option>
              <option value="cancelled">🚫 ملغاة ({baseTrips.filter((t) => t.status === 'cancelled').length})</option>
            </select>
          </div>

          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="mr-auto shadow-sm"
          >
            {isAdmin ? 'جولة جديدة / صرف بضاعة' : 'طلب جولة وبضاعة من المخزن'}
          </Button>
        </div>
      </div>

      <p className="text-sm text-secondary-500 px-1 flex items-center justify-between">
        <span>
          {filtered.length} جولة {query && `لـ "${query}"`}
        </span>
        {!isAdmin && (
          <span className="text-xs text-primary-600 font-medium">
            يمكنك كـ مندوب طلب جولة وتحديد قطع الغيار من المخزن بانتظار موافقة الإدارة.
          </span>
        )}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-secondary-100">
          <EmptyState
            icon={<Truck className="w-8 h-8" />}
            title="لا توجد جولات"
            description={
              isAdmin
                ? 'أنشئ جولة جديدة أو وافق على طلبات المندوبين'
                : 'اضغط على "طلب جولة وبضاعة" لإنشاء طلب جديد وأخذ بضاعة من المخزن بموافقة الإدارة'
            }
            action={
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
                {isAdmin ? 'إنشاء جولة' : 'طلب جولة وبضاعة'}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((trip) => {
            const totalItems = trip.items.length;
            const totalLoaded = trip.items.reduce((s, i) => s + i.loadedQty, 0);
            const totalSold = trip.items.reduce((s, i) => s + i.soldQty, 0);
            const isPending = trip.status === 'pending_approval';

            return (
              <div
                key={trip.id}
                className={`rounded-2xl bg-white ring-1 transition-all cursor-pointer p-4 flex flex-col justify-between ${
                  isPending
                    ? 'ring-amber-300 bg-amber-50/20 shadow-md hover:shadow-lg'
                    : 'ring-secondary-100 shadow-sm hover:shadow-md hover:ring-primary-200'
                }`}
                onClick={() => setViewTripId(trip.id)}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-secondary-900 text-sm leading-tight truncate">
                          {trip.driverName}
                        </h3>
                        {trip.createdByName && trip.createdByName !== trip.driverName && (
                          <span className="text-[10px] text-secondary-400">({trip.createdByName})</span>
                        )}
                      </div>
                      {trip.vehicle && (
                        <p className="text-xs text-primary-600 font-medium mt-0.5 inline-flex items-center gap-1">
                          <Car className="w-3 h-3" />
                          {trip.vehicle}
                        </p>
                      )}
                    </div>
                    <Badge tone={statusTone[trip.status]} icon={statusIcon[trip.status]}>
                      {statusLabel[trip.status]}
                    </Badge>
                  </div>

                  {isPending && (
                    <div className="mb-3 px-2.5 py-1.5 rounded-xl bg-amber-100/70 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        {isAdmin
                          ? 'طلب معلق: اضغط للموافقة وصرف القطع من المخزن'
                          : 'طلبك قيد مراجعة الإدارة لصرف البضاعة'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-secondary-500 mb-2">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-secondary-400" />
                      {trip.city || 'المدينة غير محددة'}{trip.area ? ` - ${trip.area}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-secondary-500 mb-3">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-secondary-400" />
                      {formatDate(trip.departureAt)}
                    </span>
                    <span className="text-secondary-300">|</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-secondary-700">
                      <Boxes className="w-3.5 h-3.5 text-primary-600" />
                      {totalItems} قطعة ({totalLoaded} وحدة)
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-end justify-between pt-3 border-t border-secondary-100">
                    <div>
                      <p className="text-[10px] text-secondary-400">إجمالي المبيعات</p>
                      <p className="text-base font-bold text-success-600 tabular-nums">{formatAed(trip.totalSales)}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-secondary-400">
                        {isPending ? 'المطلوب صرفه' : 'مباع بالفواتير'}
                      </p>
                      <p className="text-sm font-semibold text-secondary-700 tabular-nums">
                        {isPending ? `${totalLoaded} وحدة` : `${totalSold} وحدة`}
                      </p>
                    </div>
                  </div>

                  {/* Actions on Card */}
                  <div className="flex gap-2 mt-3 pt-2">
                    {isAdmin && isPending ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setApprovingId(trip.id);
                          }}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-success-600 hover:bg-success-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>موافقة وصرف</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRejectingId(trip.id);
                          }}
                          className="py-1.5 px-3 rounded-xl bg-error-50 hover:bg-error-100 text-error-700 text-xs font-bold transition-all flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>رفض</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewTripId(trip.id);
                          }}
                          className="py-1.5 px-2.5 rounded-xl bg-secondary-100 hover:bg-secondary-200 text-secondary-700 text-xs transition-all"
                        >
                          التفاصيل
                        </button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewTripId(trip.id);
                          }}
                        >
                          التفاصيل والقطع
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-error-600 hover:bg-error-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(trip.id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Request Trip Modal */}
      {createOpen && (
        <CreateTripModal
          onClose={() => setCreateOpen(false)}
          onCreate={async (payload, items) => {
            await createTrip(payload, items);
            setCreateOpen(false);
          }}
          isAdmin={isAdmin}
        />
      )}

      {/* View & Manage Trip Detail Modal */}
      {viewTripId && (() => {
        const liveTrip = data.trips.find((t) => t.id === viewTripId);
        if (!liveTrip) return null;
        return (
          <TripDetailModal
            trip={liveTrip}
            onClose={() => setViewTripId(null)}
            onDelete={(id) => {
              setViewTripId(null);
              setDeleteId(id);
            }}
            onApprove={(id) => {
              setViewTripId(null);
              setApprovingId(id);
            }}
            onReject={(id) => {
              setViewTripId(null);
              setRejectingId(id);
            }}
            isAdmin={isAdmin}
          />
        );
      })()}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal
          open
          onClose={() => setDeleteId(null)}
          title="تأكيد حذف الجولة"
          size="sm"
          footer={
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={() => setDeleteId(null)}>
                إلغاء
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={() => {
                  deleteTrip(deleteId);
                  setDeleteId(null);
                }}
              >
                حذف
              </Button>
            </div>
          }
        >
          <p className="text-sm text-secondary-600">
            هل أنت متأكد من حذف هذه الجولة؟ إذا كانت الجولة سارية سيتم إرجاع القطع غير المباعة إلى المخزون تلقائياً.
          </p>
        </Modal>
      )}

      {/* Admin Approval Confirmation Modal */}
      {approvingId && (() => {
        const tripToApprove = data.trips.find((t) => t.id === approvingId);
        if (!tripToApprove) return null;
        const totalItemsCount = tripToApprove.items.reduce((s, i) => s + i.loadedQty, 0);

        return (
          <Modal
            open
            onClose={() => !actionLoading && setApprovingId(null)}
            title="موافقة واعتماد الجولة وصرف البضاعة"
            size="md"
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" fullWidth disabled={actionLoading} onClick={() => setApprovingId(null)}>
                  إلغاء
                </Button>
                <Button
                  fullWidth
                  disabled={actionLoading}
                  onClick={() => handleApprove(approvingId)}
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
                  <AlertTriangle className="w-4 h-4 shrink-0" />
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
      {rejectingId && (() => {
        const tripToReject = data.trips.find((t) => t.id === rejectingId);
        if (!tripToReject) return null;

        return (
          <Modal
            open
            onClose={() => !actionLoading && setRejectingId(null)}
            title="رفض طلب الجولة"
            size="sm"
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" fullWidth disabled={actionLoading} onClick={() => setRejectingId(null)}>
                  إلغاء
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  disabled={actionLoading}
                  onClick={() => handleReject(rejectingId)}
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

interface ItemRequestRow {
  itemId: string;
  oem: string;
  description: string;
  availableStock: number;
  qty: number;
  unitPrice: number;
}

function CreateTripModal({
  onClose,
  onCreate,
  isAdmin,
}: {
  onClose: () => void;
  onCreate: (
    payload: {
      driverName: string;
      vehicle: string;
      vehicleId?: string;
      departureAt: string;
      status: TripStatus;
      city: string;
      area: string;
      notes: string;
      createdBy: string;
      createdByName: string;
    },
    items?: { itemId: string; qty: number; unitPrice?: number }[]
  ) => Promise<void>;
  isAdmin: boolean;
}) {
  const { currentUser, data } = useApp();
  const [form, setForm] = useState({
    driverName: currentUser.name,
    vehicle: data.vehicles.length > 0 ? `${data.vehicles[0].name} (${data.vehicles[0].plateNumber})` : '',
    vehicleId: data.vehicles.length > 0 ? data.vehicles[0].id : '',
    departureAt: todayISO(),
    city: 'طرابلس',
    area: '',
    notes: '',
  });

  const [requestedItems, setRequestedItems] = useState<ItemRequestRow[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.driverName.trim() && form.departureAt;

  // Search items in warehouse
  const filteredInventory = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return [];
    return data.inventory
      .filter(
        (i) =>
          i.stock > 0 &&
          !requestedItems.some((ri) => ri.itemId === i.id) &&
          (i.oem.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q) ||
            i.carModel.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [itemSearch, data.inventory, requestedItems]);

  const addItemToRequest = (inv: (typeof data.inventory)[0]) => {
    setRequestedItems((prev) => [
      ...prev,
      {
        itemId: inv.id,
        oem: inv.oem,
        description: inv.description,
        availableStock: inv.stock,
        qty: 1,
        unitPrice: inv.sellPrice,
      },
    ]);
    setItemSearch('');
  };

  const updateItemQty = (itemId: string, qty: number) => {
    setRequestedItems((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, qty: Math.max(1, Math.min(qty, it.availableStock)) } : it))
    );
  };

  const updateItemPrice = (itemId: string, unitPrice: number) => {
    setRequestedItems((prev) =>
      prev.map((it) => (it.itemId === itemId ? { ...it, unitPrice } : it))
    );
  };

  const removeItem = (itemId: string) => {
    setRequestedItems((prev) => prev.filter((it) => it.itemId !== itemId));
  };

  const totalUnits = requestedItems.reduce((s, it) => s + it.qty, 0);
  const totalEstimatedValue = requestedItems.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  const handleCreate = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      // If admin, status is 'loading' or 'active' and stock will be deducted directly.
      // If sales rep, status is 'pending_approval' waiting for Admin review and approval!
      const initialStatus: TripStatus = isAdmin ? 'loading' : 'pending_approval';

      await onCreate(
        {
          driverName: form.driverName,
          vehicle: form.vehicle,
          vehicleId: form.vehicleId || undefined,
          departureAt: form.departureAt,
          status: initialStatus,
          city: form.city,
          area: form.area,
          notes: form.notes,
          createdBy: currentUser.id,
          createdByName: currentUser.name,
        },
        requestedItems.map((it) => ({
          itemId: it.itemId,
          qty: it.qty,
          unitPrice: it.unitPrice,
        }))
      );
    } catch (e: any) {
      setError(e?.message || 'فشل إنشاء طلب الجولة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isAdmin ? 'إنشاء جولة جديدة وصرف بضاعة' : 'طلب جولة جديدة وأخذ بضاعة من المخزن'}
      size="xl"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button
            fullWidth
            disabled={!valid || saving}
            onClick={handleCreate}
            className={isAdmin ? '' : 'bg-amber-600 hover:bg-amber-700 text-white'}
          >
            {saving
              ? 'جاري المعالجة...'
              : isAdmin
              ? 'إنشاء وصرف البضاعة مباشرة'
              : 'إرسال طلب الجولة والبضاعة للإدارة'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Info Header Banner */}
        <div
          className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
            isAdmin
              ? 'bg-primary-50 border border-primary-200 text-primary-900'
              : 'bg-amber-50 border border-amber-200 text-amber-900'
          }`}
        >
          <Info className={`w-4 h-4 shrink-0 mt-0.5 ${isAdmin ? 'text-primary-600' : 'text-amber-600'}`} />
          <div>
            <p className="font-bold">
              {isAdmin
                ? 'لوحة الإدارة: صرف البضاعة وإنشاء الجولة'
                : 'بوابة المندوب: طلب جولة وبضاعة من المخزن'}
            </p>
            <p className="mt-0.5">
              {isAdmin
                ? 'سيتم خصم البضاعة المحددة من المخزن تلقائياً وبدء الجولة مباشرة.'
                : 'حدد السيارة والمدينة وقطع الغيار المطلوبة من المخزن. سيتم إرسال الطلب إلى الإدارة لاعتماده وصرف البضاعة لسيارتك.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-error-50 border border-error-200 text-error-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Basic Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Input
            label="اسم المندوب / السائق"
            value={form.driverName}
            onChange={(e) => set('driverName', e.target.value)}
            placeholder="اسم السائق أو المندوب"
          />

          <div>
            <label className="block text-xs font-semibold text-secondary-700 mb-1">السيارة / الشاحنة</label>
            {data.vehicles.length > 0 ? (
              <select
                value={form.vehicleId}
                onChange={(e) => {
                  const sel = data.vehicles.find((v) => v.id === e.target.value);
                  if (sel) {
                    setForm((f) => ({
                      ...f,
                      vehicleId: sel.id,
                      vehicle: `${sel.name} (${sel.plateNumber || 'بدون لوحة'})`,
                    }));
                  } else {
                    setForm((f) => ({ ...f, vehicleId: '', vehicle: '' }));
                  }
                }}
                className="w-full rounded-xl bg-secondary-50 px-3 py-2.5 text-sm text-secondary-900 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">-- اختر سيارة من الأسطول --</option>
                {data.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} - {v.plateNumber} ({v.model || v.type})
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={form.vehicle}
                onChange={(e) => set('vehicle', e.target.value)}
                placeholder="اسم أو لوحة السيارة (مثال: هيونداي H1)"
                className="w-full rounded-xl bg-secondary-50 px-3 py-2.5 text-sm text-secondary-900 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none"
              />
            )}
          </div>

          <Input
            label="تاريخ المغادرة"
            type="date"
            value={form.departureAt}
            onChange={(e) => set('departureAt', e.target.value)}
          />

          <Input
            label="المدينة المستهدفة"
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
            placeholder="مثال: طرابلس، مصراتة، بنغازي..."
          />

          <Input
            label="المنطقة / الخط"
            value={form.area}
            onChange={(e) => set('area', e.target.value)}
            placeholder="مثال: الكريمية، زليتن، شارع دبي..."
          />

          <Input
            label="ملاحظات الجولة"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="أي ملاحظات خاصة بالجولة أو البضاعة"
          />
        </div>

        {/* Warehouse Items Selector Section */}
        <div className="pt-2 border-t border-secondary-100 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-secondary-900 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-primary-600" />
              <span>قطع الغيار المطلوبة من المخزن للسيارة ({requestedItems.length})</span>
            </h4>
            {requestedItems.length > 0 && (
              <span className="text-xs text-secondary-500">
                إجمالي الوحدات: <strong className="text-primary-700">{totalUnits}</strong> | القيمة التقديرية:{' '}
                <strong className="text-success-600">{formatAed(totalEstimatedValue)}</strong>
              </span>
            )}
          </div>

          {/* Search Warehouse Input */}
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <input
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="ابحث بالـ OEM أو وصف القطعة أو موديل السيارة لإضافتها للجولة..."
              className="w-full rounded-xl bg-secondary-50 pr-10 pl-4 py-2.5 text-xs text-secondary-900 placeholder:text-secondary-400 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none"
            />
            {itemSearch && (
              <button
                onClick={() => setItemSearch('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Live Search Results Dropdown */}
            {filteredInventory.length > 0 && (
              <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-xl shadow-xl ring-1 ring-secondary-200 z-20 overflow-hidden divide-y divide-secondary-50">
                {filteredInventory.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => addItemToRequest(inv)}
                    className="w-full p-2.5 text-right hover:bg-primary-50 flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs text-secondary-900 truncate">{inv.description}</p>
                      <p className="text-[10px] font-mono text-secondary-400">
                        OEM: {inv.oem} {inv.carModel ? `• ${inv.carModel}` : ''}
                      </p>
                    </div>
                    <div className="text-left shrink-0">
                      <span className="text-xs font-bold text-success-600 block">{formatAed(inv.sellPrice)}</span>
                      <span className="text-[10px] text-primary-600">المتاح بالمخزن: {inv.stock}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Requested Items Table */}
          {requestedItems.length === 0 ? (
            <div className="p-5 rounded-xl border border-dashed border-secondary-200 bg-secondary-50/50 text-center text-secondary-400 text-xs flex flex-col items-center gap-1.5">
              <Package className="w-6 h-6 text-secondary-300" />
              <p>لم يتم اختيار أي قطع غيار بعد.</p>
              <p className="text-[11px] text-secondary-400">
                ابحث في الحقل أعلاه لاختيار القطع وتحديد الكميات المراد أخذها في الجولة.
              </p>
            </div>
          ) : (
            <div className="rounded-xl ring-1 ring-secondary-100 overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-secondary-50 text-secondary-500 sticky top-0">
                  <tr>
                    <th className="text-right px-3 py-2">القطعة</th>
                    <th className="text-center px-2 py-2">المتوفر بالمخزن</th>
                    <th className="text-center px-2 py-2 w-28">الكمية المطلوبة</th>
                    <th className="text-center px-2 py-2 w-24">سعر البيع</th>
                    <th className="text-center px-2 py-2">الإجمالي</th>
                    <th className="text-center px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-50">
                  {requestedItems.map((item) => (
                    <tr key={item.itemId} className="hover:bg-secondary-50/50">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-secondary-800 truncate max-w-[170px]">{item.description}</p>
                        <p className="text-[10px] font-mono text-secondary-400">{item.oem}</p>
                      </td>
                      <td className="text-center px-2 py-2 text-secondary-600 font-semibold">{item.availableStock}</td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min={1}
                          max={item.availableStock}
                          value={item.qty}
                          onChange={(e) => updateItemQty(item.itemId, Number(e.target.value) || 1)}
                          className="w-18 text-center rounded-lg bg-secondary-50 px-2 py-1 font-bold text-secondary-900 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          step="0.5"
                          value={item.unitPrice}
                          onChange={(e) => updateItemPrice(item.itemId, Number(e.target.value) || 0)}
                          className="w-18 text-center rounded-lg bg-secondary-50 px-2 py-1 font-semibold text-secondary-900 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                      </td>
                      <td className="text-center px-2 py-2 font-bold text-success-600 tabular-nums">
                        {formatAed(item.qty * item.unitPrice)}
                      </td>
                      <td className="text-center px-2 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(item.itemId)}
                          className="p-1 rounded-lg text-error-500 hover:bg-error-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function TripDetailModal({
  trip,
  onClose,
  onDelete,
  onApprove,
  onReject,
  isAdmin,
}: {
  trip: Trip;
  onClose: () => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isAdmin: boolean;
}) {
  const { data, addTripItem, updateTripItem, deleteTripItem, updateTrip } = useApp();
  const [showAddItem, setShowAddItem] = useState(false);
  const [editLoadItem, setEditLoadItem] = useState<TripItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const statusOptions: { value: TripStatus; label: string }[] = [
    { value: 'pending_approval', label: 'بانتظار موافقة الإدارة' },
    { value: 'loading', label: 'قيد التحميل' },
    { value: 'active', label: 'جارية' },
    { value: 'completed', label: 'مكتملة' },
    { value: 'rejected', label: 'مرفوضة' },
    { value: 'cancelled', label: 'ملغاة' },
  ];

  const isPending = trip.status === 'pending_approval';
  const isOpen = trip.status === 'loading' || trip.status === 'active' || isPending;
  const totalLoaded = trip.items.reduce((s, i) => s + i.loadedQty, 0);
  const totalSold = trip.items.reduce((s, i) => s + i.soldQty, 0);
  const totalRemaining = trip.items.reduce((s, i) => s + (i.loadedQty - i.soldQty - i.returnedQty), 0);
  const totalValue = trip.items.reduce((s, i) => s + i.loadedQty * i.unitPrice, 0);

  return (
    <Modal
      open
      onClose={onClose}
      title={`جولة: ${trip.driverName}`}
      size="xl"
      footer={
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm text-secondary-500">
            <span className="font-semibold text-success-600">{formatAed(trip.totalSales)}</span> إجمالي مبيعات الفواتير
          </div>
          <div className="flex items-center gap-2">
            {isPending && isAdmin && (
              <Button
                size="sm"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => onApprove(trip.id)}
                className="bg-success-600 hover:bg-success-700 text-white"
              >
                اعتماد وصرف البضاعة
              </Button>
            )}
            {isOpen && (
              <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddItem(true)}>
                إضافة قطعة للجولة
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Pending Approval Highlight */}
        {isPending && (
          <div className="rounded-xl bg-amber-50 border border-amber-300 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-xs">طلب الجولة بانتظار موافقة الإدارة وصرف البضاعة</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  طلبها المندوب: <strong>{trip.createdByName || trip.driverName}</strong> | لم يتم خصم البضاعة من المخزن حتى الآن.
                </p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onApprove(trip.id)}
                  className="px-3 py-1.5 rounded-lg bg-success-600 hover:bg-success-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>اعتماد وصرف</span>
                </button>
                <button
                  type="button"
                  onClick={() => onReject(trip.id)}
                  className="px-3 py-1.5 rounded-lg bg-error-50 hover:bg-error-100 text-error-700 text-xs font-bold transition-all flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>رفض</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Trip info */}
        <div className="rounded-xl bg-secondary-50 p-3 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-secondary-400">تاريخ المغادرة</p>
              <p className="font-semibold text-secondary-800">{formatDate(trip.departureAt)}</p>
            </div>
            <div>
              <p className="text-xs text-secondary-400">السيارة</p>
              <p className="font-semibold text-secondary-800">{trip.vehicle || 'غير محدد'}</p>
            </div>
            <div>
              <p className="text-xs text-secondary-400">المدينة / المنطقة</p>
              <p className="font-semibold text-secondary-800">
                {trip.city || 'عامة'}
                {trip.area ? ` - ${trip.area}` : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-secondary-400">حالة الجولة</p>
              {isAdmin ? (
                <select
                  value={trip.status}
                  onChange={(e) => updateTrip(trip.id, { status: e.target.value as TripStatus })}
                  className="rounded-lg bg-white px-2 py-1 text-xs font-semibold ring-1 ring-secondary-200 outline-none focus:ring-primary-500"
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Badge
                  tone={
                    trip.status === 'active'
                      ? 'primary'
                      : trip.status === 'completed'
                      ? 'success'
                      : trip.status === 'pending_approval'
                      ? 'warning'
                      : 'error'
                  }
                >
                  {statusOptions.find((o) => o.value === trip.status)?.label || trip.status}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 pt-2 border-t border-secondary-200">
            <div className="text-center">
              <p className="text-xs text-secondary-400">إجمالي المحمل بالسيارة</p>
              <p className="text-base font-bold text-secondary-800 tabular-nums">{totalLoaded} وحدة</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-secondary-400">المباع بالفواتير</p>
              <p className="text-base font-bold text-success-600 tabular-nums">{totalSold} وحدة</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-secondary-400">المتبقي بالسيارة</p>
              <p className="text-base font-bold text-primary-600 tabular-nums">{totalRemaining} وحدة</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-secondary-400">قيمة بضاعة الجولة</p>
              <p className="text-base font-bold text-secondary-900 tabular-nums">{formatAed(totalValue)}</p>
            </div>
          </div>

          {trip.notes && (
            <div className="pt-2 border-t border-secondary-200">
              <p className="text-xs text-secondary-400 mb-0.5">ملاحظات</p>
              <p className="text-xs text-secondary-700">{trip.notes}</p>
            </div>
          )}
        </div>

        {/* Info Tip */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary-50 text-primary-800 text-xs">
          <Info className="w-4 h-4 shrink-0 text-primary-600" />
          <span>البيع يتم عبر إنشاء فاتورة للعميل من قسم الفواتير مع اختيار هذه الجولة ليتم الخصم منها تلقائياً.</span>
        </div>

        {/* Items Table */}
        {trip.items.length > 0 ? (
          <div className="rounded-xl ring-1 ring-secondary-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary-50 text-xs text-secondary-500">
                <tr>
                  <th className="text-right px-3 py-2.5">القطعة</th>
                  <th className="text-center px-2 py-2.5">
                    {isPending ? 'الكمية المطلوبة' : 'المحمل بالسيارة'}
                  </th>
                  <th className="text-center px-2 py-2.5">المباع بالفواتير</th>
                  <th className="text-center px-2 py-2.5">المتبقي بالسيارة</th>
                  <th className="text-center px-2 py-2.5">سعر الوحدة</th>
                  <th className="text-center px-2 py-2.5">الإجمالي</th>
                  {isOpen && <th className="text-center px-2 py-2.5 w-24">إجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-50">
                {trip.items.map((item) => {
                  const remaining = item.loadedQty - item.soldQty - item.returnedQty;
                  return (
                    <tr key={item.id} className="hover:bg-secondary-50/50 transition-colors">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-secondary-800 text-xs truncate max-w-[170px]">
                          {item.description}
                        </p>
                        <p className="text-[10px] font-mono text-secondary-400">{item.oem}</p>
                      </td>
                      <td className="text-center tabular-nums font-semibold text-secondary-800">
                        {item.loadedQty}
                      </td>
                      <td className="text-center tabular-nums text-success-600 font-semibold">
                        {item.soldQty}
                      </td>
                      <td className="text-center tabular-nums font-bold text-primary-700">{remaining}</td>
                      <td className="text-center tabular-nums">{formatAed(item.unitPrice)}</td>
                      <td className="text-center tabular-nums font-semibold text-secondary-800">
                        {formatAed(item.loadedQty * item.unitPrice)}
                      </td>
                      {isOpen && (
                        <td className="px-2 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditLoadItem(item)}
                              className="p-1.5 rounded-lg text-secondary-600 hover:bg-secondary-100 hover:text-primary-600 transition-colors"
                              title="تعديل الكمية المحملة أو السعر"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteItemId(item.id)}
                              className="p-1.5 rounded-lg text-error-500 hover:bg-error-50 hover:text-error-700 transition-colors"
                              title="حذف القطعة من الجولة"
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
        ) : (
          <div className="rounded-xl bg-secondary-50 p-6 text-center text-secondary-400 text-sm flex flex-col items-center gap-2">
            <Package className="w-8 h-8" />
            لا توجد قطع محملة في هذه الجولة
          </div>
        )}

        {isAdmin && (
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => onDelete(trip.id)}
            >
              حذف الجولة بالكامل
            </Button>
          </div>
        )}
      </div>

      {showAddItem && (
        <AddItemModal
          inventory={data.inventory}
          isPendingTrip={isPending}
          onClose={() => setShowAddItem(false)}
          onAdd={async (itemId, qty, unitPrice) => {
            await addTripItem(trip.id, itemId, qty, unitPrice);
            setShowAddItem(false);
          }}
        />
      )}

      {editLoadItem && (
        <EditLoadModal
          item={editLoadItem}
          isPendingTrip={isPending}
          inventoryStock={data.inventory.find((i) => i.id === editLoadItem.itemId)?.stock ?? 0}
          onClose={() => setEditLoadItem(null)}
          onSave={async (qty, unitPrice) => {
            const diff = qty - editLoadItem.loadedQty;
            if (!isPending && diff !== 0) {
              const inv = data.inventory.find((i) => i.id === editLoadItem.itemId);
              if (inv && diff > 0 && inv.stock < diff) {
                alert(`الكمية المطلوبة (${diff}) أكبر من المخزون المتوفر في المخزن (${inv.stock})`);
                return;
              }
            }
            await updateTripItem(editLoadItem.id, { loadedQty: qty, unitPrice });
            setEditLoadItem(null);
          }}
        />
      )}

      {deleteItemId && (
        <Modal
          open
          onClose={() => setDeleteItemId(null)}
          title="حذف القطعة من الجولة"
          size="sm"
          footer={
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={() => setDeleteItemId(null)}>
                إلغاء
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={() => {
                  deleteTripItem(deleteItemId);
                  setDeleteItemId(null);
                }}
              >
                تأكيد الحذف
              </Button>
            </div>
          }
        >
          <p className="text-sm text-secondary-600">
            {isPending
              ? 'سيتم إزالة القطعة من طلب الجولة.'
              : 'سيتم إزالة القطعة من الجولة وإرجاع الكمية غير المباعة إلى رصيد المخزن الرئيسي تلقائياً.'}
          </p>
        </Modal>
      )}
    </Modal>
  );
}

function AddItemModal({
  inventory,
  isPendingTrip,
  onClose,
  onAdd,
}: {
  inventory: { id: string; oem: string; description: string; stock: number; sellPrice: number; purchasePrice: number }[];
  isPendingTrip?: boolean;
  onClose: () => void;
  onAdd: (itemId: string, qty: number, unitPrice?: number) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [adding, setAdding] = useState(false);

  const filtered = inventory.filter((i) => {
    const q = query.trim().toLowerCase();
    return !q || i.oem.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
  });

  const selected = inventory.find((i) => i.id === selectedId);

  const handleAdd = async () => {
    if (!selectedId || qty < 1) return;
    setAdding(true);
    try {
      await onAdd(selectedId, qty, unitPrice || undefined);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isPendingTrip ? 'إضافة قطعة لطلب الجولة' : 'إضافة قطعة للجولة (تحميل في السيارة)'}
      size="lg"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={onClose}>
            إلغاء
          </Button>
          <Button
            fullWidth
            disabled={!selectedId || qty < 1 || (selected ? qty > selected.stock : false) || adding}
            onClick={handleAdd}
          >
            {adding ? 'جاري الإضافة...' : isPendingTrip ? 'إضافة للطلب' : 'تحميل في السيارة'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث برقم القطعة (OEM) أو الوصف في المخزن..."
            className="w-full rounded-xl border-0 bg-secondary-50 pr-11 pl-4 py-3 text-secondary-900 placeholder:text-secondary-400 ring-1 ring-inset ring-secondary-200 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none"
          />
        </div>

        <div className="max-h-64 overflow-y-auto scrollbar-thin rounded-xl ring-1 ring-secondary-100 divide-y divide-secondary-50">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-secondary-400">لا توجد نتائج بالمخزن</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  setUnitPrice(item.sellPrice);
                }}
                className={`w-full px-3 py-2.5 flex items-center gap-3 text-right transition-colors ${
                  selectedId === item.id ? 'bg-primary-50' : 'hover:bg-secondary-50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-secondary-800 truncate">{item.description}</p>
                  <p className="text-xs font-mono text-secondary-400">
                    {item.oem} • متوفر بالمخزن: {item.stock}
                  </p>
                </div>
                <span className="text-sm font-semibold text-primary-600 tabular-nums">{formatAed(item.sellPrice)}</span>
              </button>
            ))
          )}
        </div>

        {selected && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Input
              label={`الكمية المراد طلبها (المتاح بالمخزن: ${selected.stock})`}
              type="number"
              min={1}
              max={selected.stock}
              value={qty}
              onChange={(e) => setQty(Math.min(Number(e.target.value), selected.stock) || 1)}
            />
            <Input
              label="سعر الوحدة (د.ل)"
              type="number"
              min={0}
              step="0.5"
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

function EditLoadModal({
  item,
  inventoryStock,
  isPendingTrip,
  onClose,
  onSave,
}: {
  item: TripItem;
  inventoryStock: number;
  isPendingTrip?: boolean;
  onClose: () => void;
  onSave: (qty: number, unitPrice: number) => Promise<void>;
}) {
  const [qty, setQty] = useState(item.loadedQty);
  const [unitPrice, setUnitPrice] = useState(item.unitPrice);
  const [saving, setSaving] = useState(false);

  const minAllowed = item.soldQty + item.returnedQty;
  const maxAddition = inventoryStock;
  const maxAllowed = isPendingTrip ? inventoryStock : item.loadedQty + maxAddition;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(qty, unitPrice);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="تعديل الكمية والسعر"
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={onClose}>
            إلغاء
          </Button>
          <Button fullWidth disabled={saving || qty < minAllowed} onClick={handleSave}>
            حفظ التعديلات
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-secondary-800">{item.description}</p>
          <p className="text-xs font-mono text-secondary-400">{item.oem}</p>
        </div>
        {!isPendingTrip && (
          <div className="rounded-xl bg-secondary-50 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-secondary-500">تم بيعه مسبقاً بالفواتير</span>
              <span className="font-semibold tabular-nums text-success-600">{item.soldQty}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-500">متاح إضافته من المخزن الرئيسي</span>
              <span className="font-semibold tabular-nums text-primary-600">+{maxAddition}</span>
            </div>
          </div>
        )}
        <Input
          label={isPendingTrip ? 'الكمية المطلوبة' : 'إجمالي الكمية المحملة بالسيارة'}
          type="number"
          min={minAllowed}
          max={maxAllowed}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value) || 0)}
        />
        <Input
          label="سعر بيع الوحدة (د.ل)"
          type="number"
          min={0}
          step="0.5"
          value={unitPrice}
          onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
        />
      </div>
    </Modal>
  );
}
