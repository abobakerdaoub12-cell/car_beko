import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { AppData, Invoice, InventoryItem, Payment, Shipment, Shop, Trip, TripItem, User, Vehicle, CapitalTransaction } from '@/types';
import { useAuth } from '@/context/AuthContext';
import * as db from '@/lib/db';

interface AppState {
  currentUser: User;
  role: User['role'];
  data: AppData;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  shopBalance: (shopId: string) => number;
  totalOutstanding: () => number;
  debtsByCity: () => { city: string; area?: string; debt: number; shopCount: number }[];
  totalCapital: () => number;
  totalExpenses: () => number;
  remainingCapital: () => number;
  addCapitalTransaction: (
    tx: Omit<CapitalTransaction, 'id' | 'createdAt' | 'balanceBefore' | 'balanceAfter' | 'totalCapitalBefore' | 'totalCapitalAfter' | 'createdBy' | 'createdByName'>
  ) => Promise<CapitalTransaction>;
  updateCapitalTransaction: (id: string, patch: Partial<CapitalTransaction>) => Promise<void>;
  deleteCapitalTransaction: (id: string) => Promise<void>;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (id: string, patch: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  clearAllInventory: () => Promise<void>;
  clearAllSystemData: () => Promise<void>;
  clearSalesAndTransactions: () => Promise<void>;
  restoreSystemData: (newData: AppData) => Promise<void>;
  adjustStock: (id: string, delta: number) => Promise<void>;
  addVehicle: (v: Omit<Vehicle, 'id' | 'createdAt'>) => Promise<void>;
  updateVehicle: (id: string, patch: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  createTrip: (
    t: Omit<Trip, 'id' | 'createdAt' | 'items' | 'totalSales'>,
    initialItems?: { itemId: string; qty: number; unitPrice?: number }[]
  ) => Promise<string>;
  approveTrip: (tripId: string) => Promise<void>;
  rejectTrip: (tripId: string, reason?: string) => Promise<void>;
  updateTrip: (id: string, patch: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  addTripItem: (tripId: string, itemId: string, qty: number, unitPrice?: number) => Promise<void>;
  updateTripItem: (id: string, patch: Partial<TripItem>) => Promise<void>;
  deleteTripItem: (id: string) => Promise<void>;
  recordTripSale: (tripItemId: string, qty: number) => Promise<void>;
  recordTripReturn: (tripItemId: string, qty: number) => Promise<void>;
  addShipment: (s: Omit<Shipment, 'id'>) => Promise<void>;
  updateShipment: (id: string, patch: Partial<Shipment>) => Promise<void>;
  deleteShipment: (id: string) => Promise<void>;
  addShop: (s: Omit<Shop, 'id' | 'createdAt'>) => Promise<void>;
  updateShop: (id: string, patch: Partial<Shop>) => Promise<void>;
  deleteShop: (id: string) => Promise<void>;
  createInvoice: (inv: Omit<Invoice, 'id' | 'number'>) => Promise<Invoice>;
  addPayment: (p: Omit<Payment, 'id' | 'createdBy'>) => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}

const emptyData: AppData = {
  shops: [],
  payments: [],
  shipments: [],
  inventory: [],
  invoices: [],
  vehicles: [],
  trips: [],
  capitalTransactions: [],
};

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      const d = await db.loadAppData();
      setData(d);
    } catch (e) {
      setError('فشل تحميل البيانات');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      reload();
    } else {
      setData(emptyData);
      setLoading(false);
    }
  }, [user, reload]);

  const shopBalance = useCallback((shopId: string): number => {
    const shop = data.shops.find((s) => s.id === shopId);
    if (!shop) return 0;
    const opening = shop.openingBalance;
    const invoicesCredit = data.invoices
      .filter((i) => i.shopId === shopId)
      .reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0);
    const paymentsMade = data.payments
      .filter((p) => p.shopId === shopId)
      .reduce((sum, p) => sum + p.amount, 0);
    return opening + invoicesCredit - paymentsMade;
  }, [data]);

  const totalOutstanding = useCallback((): number =>
    data.shops.reduce((sum, s) => sum + Math.max(0, shopBalance(s.id)), 0),
    [data.shops, shopBalance]);

  const debtsByCity = useCallback(() => {
    const map = new Map<string, { debt: number; shopCount: number }>();
    data.shops.forEach((s) => {
      const bal = Math.max(0, shopBalance(s.id));
      const key = s.city || 'other';
      const ex = map.get(key) ?? { debt: 0, shopCount: 0 };
      ex.debt += bal;
      ex.shopCount += 1;
      map.set(key, ex);
    });
    return Array.from(map.entries())
      .map(([city, v]) => ({ city, debt: v.debt, shopCount: v.shopCount }))
      .sort((a, b) => b.debt - a.debt);
  }, [data.shops, shopBalance]);

  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    const created = await db.insertInventoryItem(item);
    setData((d) => ({ ...d, inventory: [...d.inventory, created] }));
  };

  const updateInventoryItem = async (id: string, patch: Partial<InventoryItem>) => {
    await db.updateInventoryItem(id, patch);
    setData((d) => ({ ...d, inventory: d.inventory.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  };

  const deleteInventoryItem = async (id: string) => {
    await db.deleteInventoryItem(id);
    setData((d) => ({ ...d, inventory: d.inventory.filter((i) => i.id !== id) }));
  };

  const clearAllInventory = async () => {
    await db.clearAllInventory();
    setData((d) => ({ ...d, inventory: [] }));
  };

  const clearAllSystemData = async () => {
    await db.clearAllSystemData();
    setData({
      shops: [],
      payments: [],
      shipments: [],
      inventory: [],
      invoices: [],
      vehicles: [],
      trips: [],
    });
  };

  const clearSalesAndTransactions = async () => {
    await db.clearSalesAndTransactions();
    setData((d) => ({
      ...d,
      invoices: [],
      payments: [],
      trips: d.trips.map((t) => ({ ...t, items: [], totalSales: 0, status: 'completed' })),
    }));
  };

  const restoreSystemData = async (newData: AppData) => {
    await db.restoreAllSystemData(newData);
    setData(newData);
  };

  const adjustStock = async (id: string, delta: number) => {
    const item = data.inventory.find((i) => i.id === id);
    if (!item) return;
    const newStock = Math.max(0, item.stock + delta);
    await db.adjustStock(id, newStock);
    setData((d) => ({ ...d, inventory: d.inventory.map((i) => (i.id === id ? { ...i, stock: newStock } : i)) }));
  };

  const addVehicle = async (v: Omit<Vehicle, 'id' | 'createdAt'>) => {
    const created = await db.insertVehicle(v);
    setData((d) => ({ ...d, vehicles: [...d.vehicles, created] }));
  };
  const updateVehicle = async (id: string, patch: Partial<Vehicle>) => {
    await db.updateVehicle(id, patch);
    setData((d) => ({ ...d, vehicles: d.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)) }));
  };
  const deleteVehicle = async (id: string) => {
    await db.deleteVehicle(id);
    setData((d) => ({ ...d, vehicles: d.vehicles.filter((v) => v.id !== id) }));
  };

  const createTrip = async (
    t: Omit<Trip, 'id' | 'createdAt' | 'items' | 'totalSales'>,
    initialItems?: { itemId: string; qty: number; unitPrice?: number }[]
  ): Promise<string> => {
    // If user is sales rep and status not explicitly provided, default to 'pending_approval'
    const finalStatus: Trip['status'] = t.status || (user?.role === 'sales' ? 'pending_approval' : 'loading');

    const created = await db.insertTrip({
      ...t,
      status: finalStatus,
      createdBy: t.createdBy || user?.id || '',
      createdByName: t.createdByName || user?.name || '',
    });

    const createdItems: TripItem[] = [];
    if (initialItems && initialItems.length > 0) {
      for (const init of initialItems) {
        const invItem = data.inventory.find((i) => i.id === init.itemId);
        if (invItem) {
          if (finalStatus === 'loading' || finalStatus === 'active') {
            if (invItem.stock < init.qty) {
              throw new Error(`الكمية المطلوبة للقطعة (${invItem.description}) أكبر من المخزون المتوفر بالمخزن`);
            }
            const itemRes = await db.insertTripItem(created.id, invItem, init.qty, init.unitPrice);
            createdItems.push(itemRes);
            await db.adjustStock(invItem.id, Math.max(0, invItem.stock - init.qty));
          } else {
            // For pending approval, attach the requested items to trip without immediately deducting warehouse stock
            const itemRes = await db.insertTripItem(created.id, invItem, init.qty, init.unitPrice);
            createdItems.push(itemRes);
          }
        }
      }
    }

    setData((d) => {
      const itemDeductions = new Map(
        (finalStatus === 'loading' || finalStatus === 'active')
          ? createdItems.map((it) => [it.itemId, it.loadedQty])
          : []
      );

      return {
        ...d,
        trips: [{ ...created, status: finalStatus, items: createdItems }, ...d.trips],
        inventory: itemDeductions.size > 0
          ? d.inventory.map((i) => {
              const deduct = itemDeductions.get(i.id);
              return deduct ? { ...i, stock: Math.max(0, i.stock - deduct) } : i;
            })
          : d.inventory,
      };
    });

    return created.id;
  };

  const approveTrip = async (tripId: string) => {
    const trip = data.trips.find((t) => t.id === tripId);
    if (!trip) return;

    // 1. Verify inventory stock for all items
    for (const item of trip.items) {
      const inv = data.inventory.find((i) => i.id === item.itemId);
      if (inv && inv.stock < item.loadedQty) {
        throw new Error(`الكمية المطلوبة للقطعة (${item.description}) غير متوفرة بالكامل بالمخزن. المتوفر: ${inv.stock}`);
      }
    }

    // 2. Deduct inventory from DB
    for (const item of trip.items) {
      const inv = data.inventory.find((i) => i.id === item.itemId);
      if (inv) {
        const newStock = Math.max(0, inv.stock - item.loadedQty);
        await db.adjustStock(inv.id, newStock);
      }
    }

    // 3. Update trip status in DB
    await db.updateTrip(tripId, { status: 'active' });

    // 4. Update local state
    setData((d) => {
      const currentTrip = d.trips.find((t) => t.id === tripId);
      const itemMap = new Map((currentTrip?.items || []).map((it) => [it.itemId, it.loadedQty]));

      return {
        ...d,
        trips: d.trips.map((t) => (t.id === tripId ? { ...t, status: 'active' } : t)),
        inventory: d.inventory.map((i) => {
          const deducted = itemMap.get(i.id);
          return deducted ? { ...i, stock: Math.max(0, i.stock - deducted) } : i;
        }),
      };
    });
  };

  const rejectTrip = async (tripId: string, reason?: string) => {
    const noteSuffix = reason ? ` [تم الرفض: ${reason}]` : ' [تم رفض طلب الجولة]';
    const trip = data.trips.find((t) => t.id === tripId);
    const updatedNotes = (trip?.notes || '') + noteSuffix;

    await db.updateTrip(tripId, { status: 'rejected', notes: updatedNotes });
    setData((d) => ({
      ...d,
      trips: d.trips.map((t) => (t.id === tripId ? { ...t, status: 'rejected', notes: updatedNotes } : t)),
    }));
  };

  const updateTrip = async (id: string, patch: Partial<Trip>) => {
    await db.updateTrip(id, patch);
    setData((d) => ({ ...d, trips: d.trips.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  };

  const deleteTrip = async (id: string) => {
    const currentTrip = data.trips.find((t) => t.id === id);
    if (currentTrip && (currentTrip.status === 'loading' || currentTrip.status === 'active')) {
      for (const item of currentTrip.items) {
        const remaining = item.loadedQty - item.soldQty - item.returnedQty;
        if (remaining > 0) {
          const inv = data.inventory.find((i) => i.id === item.itemId);
          if (inv) {
            await db.adjustStock(inv.id, inv.stock + remaining);
          }
        }
      }
    }

    await db.deleteTrip(id);

    setData((d) => {
      const tripToDelete = d.trips.find((t) => t.id === id);
      const returnMap = new Map<string, number>();
      if (tripToDelete && (tripToDelete.status === 'loading' || tripToDelete.status === 'active')) {
        for (const it of tripToDelete.items) {
          const rem = it.loadedQty - it.soldQty - it.returnedQty;
          if (rem > 0) returnMap.set(it.itemId, (returnMap.get(it.itemId) || 0) + rem);
        }
      }
      return {
        ...d,
        trips: d.trips.filter((t) => t.id !== id),
        inventory: returnMap.size > 0
          ? d.inventory.map((i) => {
              const extra = returnMap.get(i.id);
              return extra ? { ...i, stock: i.stock + extra } : i;
            })
          : d.inventory,
      };
    });
  };

  const addTripItem = async (tripId: string, itemId: string, qty: number, unitPrice?: number) => {
    const item = data.inventory.find((i) => i.id === itemId);
    if (!item) return;
    const trip = data.trips.find((t) => t.id === tripId);
    const isPending = trip?.status === 'pending_approval' || trip?.status === 'rejected';

    if (!isPending && item.stock < qty) throw new Error('الكمية المطلوبة أكبر من المخزون المتوفر');
    const created = await db.insertTripItem(tripId, item, qty, unitPrice);

    if (!isPending) {
      await db.adjustStock(item.id, Math.max(0, item.stock - qty));
    }

    setData((d) => ({
      ...d,
      trips: d.trips.map((t) => (t.id === tripId ? { ...t, items: [...t.items, created] } : t)),
      inventory: !isPending
        ? d.inventory.map((i) => (i.id === itemId ? { ...i, stock: Math.max(0, i.stock - qty) } : i))
        : d.inventory,
    }));
  };

  const updateTripItem = async (id: string, patch: Partial<TripItem>) => {
    await db.updateTripItem(id, patch);
    setData((d) => {
      const parentTrip = d.trips.find((t) => t.items.some((it) => it.id === id));
      const oldItem = parentTrip?.items.find((it) => it.id === id);
      const isPending = parentTrip?.status === 'pending_approval' || parentTrip?.status === 'rejected';
      const loadedDiff = patch.loadedQty !== undefined && oldItem ? patch.loadedQty - oldItem.loadedQty : 0;

      return {
        ...d,
        trips: d.trips.map((t) => ({
          ...t,
          items: t.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        })),
        inventory: !isPending && loadedDiff !== 0 && oldItem
          ? d.inventory.map((i) =>
              i.id === oldItem.itemId ? { ...i, stock: Math.max(0, i.stock - loadedDiff) } : i,
            )
          : d.inventory,
      };
    });
  };

  const deleteTripItem = async (id: string) => {
    const trip = data.trips.find((t) => t.items.some((it) => it.id === id));
    const tripItem = trip?.items.find((it) => it.id === id);
    if (!tripItem) return;
    const isPending = trip.status === 'pending_approval' || trip.status === 'rejected';

    await db.deleteTripItem(id);
    const remaining = tripItem.loadedQty - tripItem.soldQty - tripItem.returnedQty;

    if (!isPending && remaining > 0) {
      const inv = data.inventory.find((i) => i.id === tripItem.itemId);
      if (inv) {
        await db.adjustStock(inv.id, inv.stock + remaining);
      }
    }

    setData((d) => ({
      ...d,
      trips: d.trips.map((t) => ({
        ...t,
        items: t.items.filter((it) => it.id !== id),
      })),
      inventory: !isPending && remaining > 0
        ? d.inventory.map((i) =>
            i.id === tripItem.itemId ? { ...i, stock: i.stock + remaining } : i,
          )
        : d.inventory,
    }));
  };

  const recordTripSale = async (tripItemId: string, qty: number) => {
    const result = await db.recordTripSale(tripItemId, qty);
    setData((d) => {
      const tripItem = d.trips.flatMap((t) => t.items).find((it) => it.id === tripItemId);
      return {
        ...d,
        trips: d.trips.map((t) => ({
          ...t,
          totalSales: t.items.some((it) => it.id === tripItemId) ? result.tripTotalSales : t.totalSales,
          items: t.items.map((it) =>
            it.id === tripItemId ? { ...it, soldQty: result.soldQty } : it,
          ),
        })),
        inventory: d.inventory.map((i) =>
          tripItem && i.id === tripItem.itemId ? { ...i, stock: result.inventoryStock } : i,
        ),
      };
    });
  };
  const recordTripReturn = async (tripItemId: string, qty: number) => {
    const result = await db.recordTripReturn(tripItemId, qty);
    setData((d) => ({
      ...d,
      trips: d.trips.map((t) => ({
        ...t,
        items: t.items.map((it) =>
          it.id === tripItemId ? { ...it, returnedQty: result.returnedQty } : it,
        ),
      })),
    }));
  };

  const addShipment = async (s: Omit<Shipment, 'id'>) => {
    const created = await db.insertShipment(s);
    setData((d) => ({ ...d, shipments: [...d.shipments, created] }));
  };

  const updateShipment = async (id: string, patch: Partial<Shipment>) => {
    await db.updateShipment(id, patch);
    setData((d) => ({ ...d, shipments: d.shipments.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  };

  const deleteShipment = async (id: string) => {
    await db.deleteShipment(id);
    setData((d) => ({ ...d, shipments: d.shipments.filter((s) => s.id !== id) }));
  };

  const addShop = async (s: Omit<Shop, 'id' | 'createdAt'>) => {
    const created = await db.insertShop(s);
    setData((d) => ({ ...d, shops: [...d.shops, created] }));
  };

  const updateShop = async (id: string, patch: Partial<Shop>) => {
    await db.updateShop(id, patch);
    setData((d) => ({ ...d, shops: d.shops.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  };

  const deleteShop = async (id: string) => {
    await db.deleteShop(id);
    setData((d) => ({ ...d, shops: d.shops.filter((s) => s.id !== id) }));
  };

  const createInvoice = async (inv: Omit<Invoice, 'id' | 'number'>): Promise<Invoice> => {
    const nextNum = await db.getNextInvoiceNumber(data.invoices.length);
    const created = await db.createInvoice(inv, nextNum);
    setData((d) => {
      let nextTrips = d.trips;
      let nextInventory = d.inventory;

      if (inv.tripId) {
        nextTrips = d.trips.map((t) => {
          if (t.id !== inv.tripId) return t;
          const updatedItems = t.items.map((it) => {
            const line = inv.lines.find((l) => l.itemId === it.itemId || l.itemId === it.id);
            if (!line) return it;
            return { ...it, soldQty: it.soldQty + line.qty };
          });
          const totalSales = updatedItems.reduce((s, it) => s + it.soldQty * it.unitPrice, 0);
          return { ...t, items: updatedItems, totalSales };
        });
      } else {
        nextInventory = d.inventory.map((i) => {
          const line = inv.lines.find((l) => l.itemId === i.id);
          return line ? { ...i, stock: Math.max(0, i.stock - line.qty) } : i;
        });
      }

      return {
        ...d,
        invoices: [created, ...d.invoices],
        trips: nextTrips,
        inventory: nextInventory,
      };
    });
    return created;
  };

  const addPayment = async (p: Omit<Payment, 'id' | 'createdBy'>) => {
    const created = await db.insertPayment({ ...p, createdBy: user?.id ?? '' });
    setData((d) => ({ ...d, payments: [created, ...d.payments] }));
  };

  const totalCapital = useCallback((): number => {
    const txs = data.capitalTransactions || [];
    return txs.reduce((sum, tx) => {
      if (tx.type === 'capital_initial' || tx.type === 'capital_injection') {
        return sum + (Number(tx.amount) || 0);
      }
      return sum;
    }, 0);
  }, [data.capitalTransactions]);

  const totalExpenses = useCallback((): number => {
    const txs = data.capitalTransactions || [];
    return txs.reduce((sum, tx) => {
      if (tx.type === 'expense') {
        return sum + (Number(tx.amount) || 0);
      }
      return sum;
    }, 0);
  }, [data.capitalTransactions]);

  const remainingCapital = useCallback((): number => {
    return totalCapital() - totalExpenses();
  }, [totalCapital, totalExpenses]);

  const addCapitalTransaction = async (
    tx: Omit<CapitalTransaction, 'id' | 'createdAt' | 'balanceBefore' | 'balanceAfter' | 'totalCapitalBefore' | 'totalCapitalAfter' | 'createdBy' | 'createdByName'>
  ): Promise<CapitalTransaction> => {
    const currentCap = totalCapital();
    const currentBal = remainingCapital();

    const balanceBefore = currentBal;
    const totalCapitalBefore = currentCap;

    let balanceAfter = balanceBefore;
    let totalCapitalAfter = totalCapitalBefore;

    if (tx.type === 'capital_initial' || tx.type === 'capital_injection') {
      totalCapitalAfter = totalCapitalBefore + tx.amount;
      balanceAfter = balanceBefore + tx.amount;
    } else if (tx.type === 'expense') {
      // Total capital remains unchanged on expenses as requested!
      totalCapitalAfter = totalCapitalBefore;
      // Deducted automatically from remaining capital
      balanceAfter = balanceBefore - tx.amount;
    }

    const created = await db.insertCapitalTransaction({
      ...tx,
      balanceBefore,
      balanceAfter,
      totalCapitalBefore,
      totalCapitalAfter,
      createdBy: user?.id ?? '',
      createdByName: user?.name ?? 'الإدارة',
    });

    setData((d) => ({
      ...d,
      capitalTransactions: [...(d.capitalTransactions || []), created],
    }));

    return created;
  };

  const updateCapitalTransaction = async (id: string, patch: Partial<CapitalTransaction>) => {
    await db.updateCapitalTransaction(id, patch);
    setData((d) => ({
      ...d,
      capitalTransactions: (d.capitalTransactions || []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  };

  const deleteCapitalTransaction = async (id: string) => {
    await db.deleteCapitalTransaction(id);
    setData((d) => ({
      ...d,
      capitalTransactions: (d.capitalTransactions || []).filter((t) => t.id !== id),
    }));
  };

  return (
    <Ctx.Provider value={{
      currentUser: user!,
      role: user?.role ?? 'sales',
      data, loading, error, reload,
      shopBalance, totalOutstanding, debtsByCity,
      totalCapital, totalExpenses, remainingCapital,
      addCapitalTransaction, updateCapitalTransaction, deleteCapitalTransaction,
      addInventoryItem, updateInventoryItem, deleteInventoryItem, clearAllInventory, clearAllSystemData, clearSalesAndTransactions, restoreSystemData, adjustStock,
      addVehicle, updateVehicle, deleteVehicle,
      createTrip, approveTrip, rejectTrip, updateTrip, deleteTrip,
      addTripItem, updateTripItem, deleteTripItem,
      recordTripSale, recordTripReturn,
      addShipment, updateShipment, deleteShipment,
      addShop, updateShop, deleteShop,
      createInvoice, addPayment,
    }}>
      {children}
    </Ctx.Provider>
  );
}
