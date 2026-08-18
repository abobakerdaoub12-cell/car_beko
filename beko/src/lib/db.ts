import { supabase } from '@/lib/supabase';
import type { AppData, Shop, Payment, Shipment, InventoryItem, Invoice, InvoiceLine, Vehicle, Trip, TripItem, CapitalTransaction } from '@/types';

export function isValidUuid(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim()) ||
         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

// ---- Row types (snake_case from Supabase DB) ----
interface CapitalTransactionRow {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  vehicle_id: string | null;
  vehicle_name: string | null;
  balance_before: number;
  balance_after: number;
  total_capital_before?: number;
  total_capital_after?: number;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

interface VehicleRow {
  id: string;
  name: string;
  plate_number: string;
  type: string;
  model: string;
  status: string;
  created_at: string;
}

interface TripRow {
  id: string;
  driver_name: string;
  vehicle: string;
  vehicle_id: string | null;
  departure_at: string;
  return_at: string | null;
  status: string;
  total_sales: number;
  city: string;
  area: string;
  notes?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

interface TripItemRow {
  id: string;
  trip_id: string;
  item_id: string;
  oem: string;
  description: string;
  loaded_qty: number;
  sold_qty: number;
  returned_qty: number;
  unit_price: number;
  unit_cost: number;
}

interface ShopRow {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  city: string;
  area: string;
  opening_balance: number;
  created_at: string;
}

interface PaymentRow {
  id: string;
  shop_id: string;
  amount: number;
  method: string;
  date: string;
  note?: string;
  created_by?: string;
}

interface ShipmentRow {
  id: string;
  ref: string;
  departure_date: string;
  arrival_date: string;
  status: string;
  total_cost_cny: number;
  total_shipping_cny: number;
  cny_to_lyd_rate: number;
  item_count: number;
}

interface InventoryRow {
  id: string;
  oem: string;
  description: string;
  car_model: string;
  category: string;
  shelf: string;
  stock: number;
  min_stock: number;
  purchase_price: number;
  sell_price: number;
  shipment_id?: string;
}

interface InvoiceRow {
  id: string;
  number: string;
  shop_id: string;
  shop_name: string;
  date: string;
  subtotal: number;
  discount: number;
  total: number;
  total_cost: number;
  payment_method: string;
  paid_amount: number;
  cash_amount?: number;
  bank_amount?: number;
  trip_id?: string;
  trip_name?: string;
  created_by?: string;
  created_by_name?: string;
  status: string;
}

interface InvoiceLineRow {
  id: string;
  invoice_id: string;
  item_id: string;
  oem: string;
  description: string;
  qty: number;
  unit_price: number;
  unit_cost: number;
  line_total: number;
  line_cost: number;
}

export interface ProfileRow {
  id: string;
  name: string;
  role: 'admin' | 'sales';
  created_at?: string;
  email?: string;
  is_blocked?: boolean;
}

// ---- Mappers: DB row -> App TypeScript interface ----
function mapShop(r: any): Shop {
  return {
    id: r.id,
    name: r.name || '',
    ownerName: r.owner_name || r.owner || '',
    phone: r.phone || '',
    city: r.city || '',
    area: r.area || '',
    openingBalance: Number(r.opening_balance || r.balance || 0),
    createdAt: r.created_at || '',
  };
}

function mapPayment(r: PaymentRow): Payment {
  return {
    id: r.id,
    shopId: r.shop_id,
    amount: Number(r.amount || 0),
    method: r.method as Payment['method'],
    date: r.date,
    note: r.note,
    createdBy: r.created_by,
  };
}

function mapShipment(r: ShipmentRow): Shipment {
  return {
    id: r.id,
    ref: r.ref,
    departureDate: r.departure_date,
    arrivalDate: r.arrival_date,
    status: r.status as Shipment['status'],
    totalCostCny: Number(r.total_cost_cny || 0),
    totalShippingCny: Number(r.total_shipping_cny || 0),
    cnyToLydRate: Number(r.cny_to_lyd_rate || 0),
    itemCount: Number(r.item_count || 0),
  };
}

function mapInventory(r: InventoryRow): InventoryItem {
  return {
    id: r.id,
    oem: r.oem,
    description: r.description,
    carModel: r.car_model,
    category: r.category,
    shelf: r.shelf,
    stock: Number(r.stock || 0),
    minStock: Number(r.min_stock || 0),
    purchasePrice: Number(r.purchase_price || 0),
    sellPrice: Number(r.sell_price || 0),
    shipmentId: r.shipment_id,
  };
}

function mapInvoice(r: InvoiceRow, lines: InvoiceLine[]): Invoice {
  return {
    id: r.id,
    number: r.number,
    shopId: r.shop_id,
    shopName: r.shop_name,
    date: r.date,
    lines,
    subtotal: Number(r.subtotal || 0),
    discount: Number(r.discount || 0),
    total: Number(r.total || 0),
    totalCost: Number(r.total_cost || 0),
    paymentMethod: r.payment_method as Invoice['paymentMethod'],
    paidAmount: Number(r.paid_amount || 0),
    cashAmount: r.cash_amount != null ? Number(r.cash_amount) : undefined,
    bankAmount: r.bank_amount != null ? Number(r.bank_amount) : undefined,
    tripId: r.trip_id,
    tripName: r.trip_name,
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    status: r.status as Invoice['status'],
  };
}

function mapVehicle(r: VehicleRow): Vehicle {
  return {
    id: r.id,
    name: r.name,
    plateNumber: r.plate_number,
    type: r.type,
    model: r.model,
    status: r.status as Vehicle['status'],
    createdAt: r.created_at,
  };
}

function mapTripItem(r: TripItemRow): TripItem {
  return {
    id: r.id,
    tripId: r.trip_id,
    itemId: r.item_id,
    oem: r.oem,
    description: r.description,
    loadedQty: Number(r.loaded_qty || 0),
    soldQty: Number(r.sold_qty || 0),
    returnedQty: Number(r.returned_qty || 0),
    unitPrice: Number(r.unit_price || 0),
    unitCost: Number(r.unit_cost || 0),
  };
}

function mapTrip(r: TripRow, items: TripItem[]): Trip {
  return {
    id: r.id,
    driverName: r.driver_name,
    vehicle: r.vehicle,
    vehicleId: r.vehicle_id ?? undefined,
    departureAt: r.departure_at,
    returnAt: r.return_at ?? undefined,
    status: r.status as Trip['status'],
    totalSales: Number(r.total_sales || 0),
    city: r.city,
    area: r.area,
    notes: r.notes,
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    createdAt: r.created_at,
    items,
  };
}

function mapLine(r: InvoiceLineRow): InvoiceLine {
  return {
    itemId: r.item_id,
    oem: r.oem,
    description: r.description,
    qty: Number(r.qty || 0),
    unitPrice: Number(r.unit_price || 0),
    unitCost: Number(r.unit_cost || 0),
    lineTotal: Number(r.line_total || 0),
    lineCost: Number(r.line_cost || 0),
  };
}

function mapCapitalTransaction(r: CapitalTransactionRow): CapitalTransaction {
  return {
    id: r.id,
    type: r.type as CapitalTransaction['type'],
    category: r.category || '',
    amount: Number(r.amount || 0),
    date: r.date,
    description: r.description || '',
    vehicleId: r.vehicle_id ?? undefined,
    vehicleName: r.vehicle_name ?? undefined,
    balanceBefore: Number(r.balance_before || 0),
    balanceAfter: Number(r.balance_after || 0),
    totalCapitalBefore: Number(r.total_capital_before || 0),
    totalCapitalAfter: Number(r.total_capital_after || 0),
    createdBy: r.created_by || '',
    createdByName: r.created_by_name || '',
    createdAt: r.created_at || '',
  };
}

// ---- Load all data directly from Supabase ----
export async function loadAppData(): Promise<AppData> {
  const [shops, payments, shipments, inventory, invoices, lines, vehicles, trips, tripItems, capitalTxs] = await Promise.all([
    supabase.from('shops').select('*').order('created_at', { ascending: true }),
    supabase.from('payments').select('*').order('date', { ascending: false }),
    supabase.from('shipments').select('*').order('created_at', { ascending: true }),
    supabase.from('inventory').select('*').order('created_at', { ascending: true }),
    supabase.from('invoices').select('*').order('created_at', { ascending: false }),
    supabase.from('invoice_lines').select('*'),
    supabase.from('vehicles').select('*').order('created_at', { ascending: true }),
    supabase.from('trips').select('*').order('created_at', { ascending: false }),
    supabase.from('trip_items').select('*'),
    supabase.from('capital_transactions').select('*').order('date', { ascending: true }).order('created_at', { ascending: true }),
  ]);

  if (shops.error) console.error('Supabase fetch error (shops):', shops.error);
  if (payments.error) console.error('Supabase fetch error (payments):', payments.error);
  if (shipments.error) console.error('Supabase fetch error (shipments):', shipments.error);
  if (inventory.error) console.error('Supabase fetch error (inventory):', inventory.error);
  if (invoices.error) console.error('Supabase fetch error (invoices):', invoices.error);
  if (vehicles.error) console.error('Supabase fetch error (vehicles):', vehicles.error);
  if (trips.error) console.error('Supabase fetch error (trips):', trips.error);
  if (capitalTxs.error) console.warn('Supabase fetch warning (capital_transactions):', capitalTxs.error);

  const lineRows = (lines.data as InvoiceLineRow[]) ?? [];
  const invoiceRows = (invoices.data as InvoiceRow[]) ?? [];

  const linesByInvoice = new Map<string, InvoiceLine[]>();
  for (const l of lineRows) {
    const arr = linesByInvoice.get(l.invoice_id) ?? [];
    arr.push(mapLine(l));
    linesByInvoice.set(l.invoice_id, arr);
  }

  const tripItemRows = (tripItems.data as TripItemRow[]) ?? [];
  const itemsByTrip = new Map<string, TripItem[]>();
  for (const ti of tripItemRows) {
    const arr = itemsByTrip.get(ti.trip_id) ?? [];
    arr.push(mapTripItem(ti));
    itemsByTrip.set(ti.trip_id, arr);
  }

  const capitalList = ((capitalTxs.data as CapitalTransactionRow[]) ?? []).map(mapCapitalTransaction);

  return {
    shops: ((shops.data as ShopRow[]) ?? []).map(mapShop),
    payments: ((payments.data as PaymentRow[]) ?? []).map(mapPayment),
    shipments: ((shipments.data as ShipmentRow[]) ?? []).map(mapShipment),
    inventory: ((inventory.data as InventoryRow[]) ?? []).map(mapInventory),
    invoices: invoiceRows.map((r) => mapInvoice(r, linesByInvoice.get(r.id) ?? [])),
    vehicles: ((vehicles.data as VehicleRow[]) ?? []).map(mapVehicle),
    trips: ((trips.data as TripRow[]) ?? []).map((r) => mapTrip(r, itemsByTrip.get(r.id) ?? [])),
    capitalTransactions: capitalList,
  };
}

// ---- Shops ----
export async function insertShop(s: Omit<Shop, 'id' | 'createdAt'>): Promise<Shop> {
  const payload = {
    name: (s.name || '').trim(),
    owner_name: (s.ownerName || '').trim(),
    phone: (s.phone || '').trim(),
    city: s.city || '',
    area: s.area || '',
    opening_balance: Number(s.openingBalance) || 0,
  };

  const { data, error } = await supabase
    .from('shops')
    .insert(payload)
    .select('*')
    .single();

  if (!error && data) {
    return mapShop(data);
  }

  if (error) {
    console.warn('First insertShop attempt warning:', error);

    // Fallback 1: in case 'area' or other column is missing in user's Supabase table
    const fallbackPayload1 = {
      name: (s.name || '').trim(),
      owner_name: (s.ownerName || '').trim(),
      phone: (s.phone || '').trim(),
      city: s.city || '',
      opening_balance: Number(s.openingBalance) || 0,
    };
    const { data: fbData1, error: fbErr1 } = await supabase
      .from('shops')
      .insert(fallbackPayload1)
      .select('*')
      .single();

    if (!fbErr1 && fbData1) {
      return mapShop(fbData1);
    }

    // Fallback 2: minimal columns (name, phone, city)
    const fallbackPayload2 = {
      name: (s.name || '').trim(),
      phone: (s.phone || '').trim(),
      city: s.city || '',
    };
    const { data: fbData2, error: fbErr2 } = await supabase
      .from('shops')
      .insert(fallbackPayload2)
      .select('*')
      .single();

    if (!fbData2 && fbErr2) {
      const finalMsg = error.message || fbErr1?.message || fbErr2?.message || 'خطأ في قاعدة بيانات سوبابيز';
      console.error('All insertShop attempts failed:', finalMsg, error);
      throw new Error(`تعذر حفظ العميل في سوبابيز: ${finalMsg}`);
    }

    if (fbData2) {
      return mapShop(fbData2);
    }
  }

  throw new Error('تعذر إدراج بيانات العميل في سوبابيز');
}

export async function updateShop(id: string, patch: Partial<Shop>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = (patch.name || '').trim();
  if (patch.ownerName !== undefined) row.owner_name = (patch.ownerName || '').trim();
  if (patch.phone !== undefined) row.phone = (patch.phone || '').trim();
  if (patch.city !== undefined) row.city = patch.city || '';
  if (patch.area !== undefined) row.area = patch.area || '';
  if (patch.openingBalance !== undefined) row.opening_balance = Number(patch.openingBalance) || 0;

  const { error } = await supabase.from('shops').update(row).eq('id', id);
  if (error) {
    console.error('Supabase updateShop error:', error);
    throw error;
  }
}

export async function deleteShop(id: string): Promise<void> {
  const { error } = await supabase.from('shops').delete().eq('id', id);
  if (error) throw error;
}

// ---- Payments ----
export async function insertPayment(p: Omit<Payment, 'id'>): Promise<Payment> {
  const payload = {
    shop_id: p.shopId,
    amount: Number(p.amount) || 0,
    method: p.method,
    date: p.date,
    note: p.note ?? null,
    created_by: p.createdBy ?? null,
  };

  const { data, error } = await supabase
    .from('payments')
    .insert(payload)
    .select('*')
    .single();

  if (!error && data) {
    const mapped = mapPayment(data as PaymentRow);
    if (p.method === 'mixed') mapped.method = 'mixed';
    if (p.cashAmount !== undefined) mapped.cashAmount = p.cashAmount;
    if (p.bankAmount !== undefined) mapped.bankAmount = p.bankAmount;
    return mapped;
  }

  // If method check constraint fails (e.g. 23514), fallback to cash or bank and append details to note
  if (error && (error.code === '23514' || error.message?.includes('check constraint') || error.message?.includes('payments_method_check'))) {
    console.warn('insertPayment method constraint fallback triggered:', error);
    const fallbackMethod = p.method === 'bank' ? 'bank' : 'cash';
    const fallbackNote = p.method === 'mixed'
      ? `${p.note || 'سداد مختلط'} [مختلط: كاش ${p.cashAmount ?? 0} + بنك ${p.bankAmount ?? 0}]`
      : (p.note ?? null);

    const { data: fbData, error: fbErr } = await supabase
      .from('payments')
      .insert({
        ...payload,
        method: fallbackMethod,
        note: fallbackNote,
      })
      .select('*')
      .single();

    if (!fbErr && fbData) {
      const mapped = mapPayment(fbData as PaymentRow);
      mapped.method = p.method;
      if (p.cashAmount !== undefined) mapped.cashAmount = p.cashAmount;
      if (p.bankAmount !== undefined) mapped.bankAmount = p.bankAmount;
      return mapped;
    }

    throw fbErr || error;
  }

  if (error) {
    console.error('Supabase insertPayment error:', error);
    throw error;
  }

  return mapPayment(data as PaymentRow);
}

// ---- Shipments ----
export async function insertShipment(s: Omit<Shipment, 'id'>): Promise<Shipment> {
  const { data, error } = await supabase
    .from('shipments')
    .insert({
      ref: s.ref,
      departure_date: s.departureDate,
      arrival_date: s.arrivalDate,
      status: s.status,
      total_cost_cny: s.totalCostCny,
      total_shipping_cny: s.totalShippingCny,
      cny_to_lyd_rate: s.cnyToLydRate,
      item_count: s.itemCount,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapShipment(data as ShipmentRow);
}

export async function updateShipment(id: string, patch: Partial<Shipment>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.ref !== undefined) row.ref = patch.ref;
  if (patch.departureDate !== undefined) row.departure_date = patch.departureDate;
  if (patch.arrivalDate !== undefined) row.arrival_date = patch.arrivalDate;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.totalCostCny !== undefined) row.total_cost_cny = patch.totalCostCny;
  if (patch.totalShippingCny !== undefined) row.total_shipping_cny = patch.totalShippingCny;
  if (patch.cnyToLydRate !== undefined) row.cny_to_lyd_rate = patch.cnyToLydRate;
  if (patch.itemCount !== undefined) row.item_count = patch.itemCount;

  const { error } = await supabase.from('shipments').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteShipment(id: string): Promise<void> {
  const { error } = await supabase.from('shipments').delete().eq('id', id);
  if (error) throw error;
}

// ---- Inventory ----
export async function insertInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory')
    .insert({
      oem: item.oem,
      description: item.description,
      car_model: item.carModel,
      category: item.category,
      shelf: item.shelf,
      stock: item.stock,
      min_stock: item.minStock,
      purchase_price: item.purchasePrice,
      sell_price: item.sellPrice,
      shipment_id: isValidUuid(item.shipmentId) ? item.shipmentId : null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapInventory(data as InventoryRow);
}

export async function updateInventoryItem(id: string, patch: Partial<InventoryItem>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.oem !== undefined) row.oem = patch.oem;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.carModel !== undefined) row.car_model = patch.carModel;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.shelf !== undefined) row.shelf = patch.shelf;
  if (patch.stock !== undefined) row.stock = patch.stock;
  if (patch.minStock !== undefined) row.min_stock = patch.minStock;
  if (patch.purchasePrice !== undefined) row.purchase_price = patch.purchasePrice;
  if (patch.sellPrice !== undefined) row.sell_price = patch.sellPrice;
  if (patch.shipmentId !== undefined) row.shipment_id = isValidUuid(patch.shipmentId) ? patch.shipmentId : null;

  const { error } = await supabase.from('inventory').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) throw error;
}

export async function clearAllInventory(): Promise<void> {
  const { error } = await supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

export async function clearAllSystemData(): Promise<void> {
  await supabase.from('capital_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('trip_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('trips').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('invoice_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('vehicles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('shipments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('shops').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}

export async function clearSalesAndTransactions(): Promise<void> {
  await supabase.from('trip_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('invoice_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('trips').update({ total_sales: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
}

export async function restoreAllSystemData(newData: AppData): Promise<void> {
  // First clean existing data
  await clearAllSystemData();

  // 1. Insert shops
  if (newData.shops && newData.shops.length > 0) {
    const shopRows = newData.shops.map((s) => ({
      name: s.name,
      owner_name: s.ownerName,
      phone: s.phone,
      city: s.city,
      area: s.area,
      opening_balance: s.openingBalance,
    }));
    await supabase.from('shops').insert(shopRows);
  }

  // 2. Insert shipments
  if (newData.shipments && newData.shipments.length > 0) {
    const shipmentRows = newData.shipments.map((s) => ({
      ref: s.ref,
      departure_date: s.departureDate,
      arrival_date: s.arrivalDate,
      status: s.status,
      total_cost_cny: s.totalCostCny,
      total_shipping_cny: s.totalShippingCny,
      cny_to_lyd_rate: s.cnyToLydRate,
      item_count: s.itemCount,
    }));
    await supabase.from('shipments').insert(shipmentRows);
  }

  // 3. Insert inventory
  if (newData.inventory && newData.inventory.length > 0) {
    const inventoryRows = newData.inventory.map((i) => ({
      oem: i.oem,
      description: i.description,
      car_model: i.carModel,
      category: i.category,
      shelf: i.shelf,
      stock: i.stock,
      min_stock: i.minStock,
      purchase_price: i.purchasePrice,
      sell_price: i.sellPrice,
    }));
    await supabase.from('inventory').insert(inventoryRows);
  }

  // 4. Insert vehicles
  if (newData.vehicles && newData.vehicles.length > 0) {
    const vehicleRows = newData.vehicles.map((v) => ({
      name: v.name,
      plate_number: v.plateNumber,
      type: v.type,
      model: v.model,
      status: v.status,
    }));
    await supabase.from('vehicles').insert(vehicleRows);
  }

  // 5. Insert capital transactions
  if (newData.capitalTransactions && newData.capitalTransactions.length > 0) {
    const capRows = newData.capitalTransactions.map((c) => ({
      type: c.type,
      category: c.category || '',
      amount: c.amount,
      date: c.date,
      description: c.description || '',
      vehicle_id: isValidUuid(c.vehicleId) ? c.vehicleId : null,
      vehicle_name: c.vehicleName || '',
      balance_before: c.balanceBefore,
      balance_after: c.balanceAfter,
      total_capital_before: c.totalCapitalBefore ?? 0,
      total_capital_after: c.totalCapitalAfter ?? 0,
      created_by: c.createdBy || '',
      created_by_name: c.createdByName || '',
    }));
    await supabase.from('capital_transactions').insert(capRows);
  }
}

export async function adjustStock(id: string, newStock: number): Promise<void> {
  const { error } = await supabase.from('inventory').update({ stock: newStock }).eq('id', id);
  if (error) throw error;
}

export function parseInvoiceNum(val: any): number {
  if (typeof val === 'number' && !isNaN(val) && val > 0) return Math.floor(val);
  if (!val) return 1;
  const digits = String(val).replace(/\D/g, '');
  const parsed = parseInt(digits, 10);
  return isNaN(parsed) || parsed <= 0 ? 1 : parsed;
}

async function getMaxInvoiceNumberFromDB(): Promise<number> {
  try {
    const { data } = await supabase
      .from('invoices')
      .select('number')
      .order('number', { ascending: false })
      .limit(1);

    if (data && data.length > 0 && data[0].number !== null && data[0].number !== undefined) {
      return parseInvoiceNum(data[0].number);
    }
  } catch (err) {
    console.warn('Failed to query max invoice number:', err);
  }
  return 0;
}

// ---- Invoices ----
export async function insertInvoice(
  inv: Omit<Invoice, 'id' | 'number'>,
  nextNumber: string,
): Promise<Invoice> {
  let targetNumber = parseInvoiceNum(nextNumber);
  let invRow: InvoiceRow | null = null;
  let lastError: any = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const fullPayload = {
      number: targetNumber,
      shop_id: inv.shopId,
      shop_name: inv.shopName,
      date: inv.date,
      subtotal: inv.subtotal,
      discount: inv.discount,
      total: inv.total,
      total_cost: inv.totalCost,
      payment_method: inv.paymentMethod,
      paid_amount: inv.paidAmount,
      cash_amount: inv.cashAmount ?? (inv.paymentMethod === 'cash' ? inv.paidAmount : null),
      bank_amount: inv.bankAmount ?? (inv.paymentMethod === 'bank' ? inv.paidAmount : null),
      trip_id: isValidUuid(inv.tripId) ? inv.tripId : null,
      trip_name: inv.tripName ?? null,
      created_by: inv.createdBy ?? null,
      created_by_name: inv.createdByName ?? null,
      status: inv.status,
    };

    const { data: primaryData, error: primaryErr } = await supabase
      .from('invoices')
      .insert(fullPayload)
      .select('*')
      .single();

    if (!primaryErr && primaryData) {
      invRow = primaryData as InvoiceRow;
      break;
    }

    // If duplicate invoice number conflict occurs, increment and retry
    if (
      primaryErr?.code === '23505' ||
      primaryErr?.message?.includes('invoices_number_key') ||
      primaryErr?.message?.includes('duplicate key')
    ) {
      console.warn(`Invoice number ${targetNumber} duplicate detected (attempt ${attempt + 1}), fetching max number...`);
      const currentMax = await getMaxInvoiceNumberFromDB();
      targetNumber = Math.max(currentMax, targetNumber) + 1;
      continue;
    }

    console.warn('insertInvoice primary payload warning, attempting fallbacks:', primaryErr);

    // Fallback 1: remove extended columns (trip_name, created_by_name, cash_amount, bank_amount)
    const fallbackPayload1 = {
      number: targetNumber,
      shop_id: inv.shopId,
      shop_name: inv.shopName,
      date: inv.date,
      subtotal: inv.subtotal,
      discount: inv.discount,
      total: inv.total,
      total_cost: inv.totalCost,
      payment_method: inv.paymentMethod,
      paid_amount: inv.paidAmount,
      trip_id: isValidUuid(inv.tripId) ? inv.tripId : null,
      created_by: inv.createdBy ?? null,
      status: inv.status,
    };

    const { data: fbData1, error: fbErr1 } = await supabase
      .from('invoices')
      .insert(fallbackPayload1)
      .select('*')
      .single();

    if (!fbErr1 && fbData1) {
      invRow = fbData1 as InvoiceRow;
      break;
    }

    if (
      fbErr1?.code === '23505' ||
      fbErr1?.message?.includes('invoices_number_key') ||
      fbErr1?.message?.includes('duplicate key')
    ) {
      const currentMax = await getMaxInvoiceNumberFromDB();
      targetNumber = Math.max(currentMax, targetNumber) + 1;
      continue;
    }

    // Fallback 2: minimal required invoice columns
    const fallbackPayload2 = {
      number: targetNumber,
      shop_id: inv.shopId,
      shop_name: inv.shopName,
      date: inv.date,
      subtotal: inv.subtotal,
      discount: inv.discount,
      total: inv.total,
      total_cost: inv.totalCost,
      payment_method: inv.paymentMethod,
      paid_amount: inv.paidAmount,
      status: inv.status,
    };

    const { data: fbData2, error: fbErr2 } = await supabase
      .from('invoices')
      .insert(fallbackPayload2)
      .select('*')
      .single();

    if (!fbErr2 && fbData2) {
      invRow = fbData2 as InvoiceRow;
      break;
    }

    if (
      fbErr2?.code === '23505' ||
      fbErr2?.message?.includes('invoices_number_key') ||
      fbErr2?.message?.includes('duplicate key')
    ) {
      const currentMax = await getMaxInvoiceNumberFromDB();
      targetNumber = Math.max(currentMax, targetNumber) + 1;
      continue;
    }

    lastError = primaryErr || fbErr1 || fbErr2;
    break;
  }

  if (!invRow) {
    console.error('All insertInvoice attempts failed:', lastError);
    throw lastError || new Error('فشل حفظ الفاتورة في سوبابيز');
  }

  const invoiceId = invRow.id;

  // Insert lines
  if (inv.lines.length > 0) {
    const lineInserts = inv.lines.map((l) => ({
      invoice_id: invoiceId,
      item_id: l.itemId,
      oem: l.oem,
      description: l.description,
      qty: l.qty,
      unit_price: l.unitPrice,
      unit_cost: l.unitCost,
      line_total: l.lineTotal,
      line_cost: l.lineCost,
    }));

    const { error: linesErr } = await supabase.from('invoice_lines').insert(lineInserts);
    if (linesErr) throw linesErr;
  }

  // Update inventory stock (decrement) or trip item stock if from trip
  if (inv.tripId) {
    for (const line of inv.lines) {
      // Find trip_item row
      const { data: tiData } = await supabase
        .from('trip_items')
        .select('id, sold_qty')
        .eq('trip_id', inv.tripId)
        .eq('item_id', line.itemId)
        .maybeSingle();

      if (tiData) {
        await supabase
          .from('trip_items')
          .update({ sold_qty: (tiData.sold_qty || 0) + line.qty })
          .eq('id', tiData.id);
      }
    }

    // Update trip total_sales
    const { data: tripData } = await supabase
      .from('trips')
      .select('total_sales')
      .eq('id', inv.tripId)
      .single();

    if (tripData) {
      await supabase
        .from('trips')
        .update({ total_sales: (Number(tripData.total_sales) || 0) + inv.total })
        .eq('id', inv.tripId);
    }
  } else {
    // Direct store sale: decrement inventory
    for (const line of inv.lines) {
      if (!line.itemId) continue;
      const { data: cur } = await supabase
        .from('inventory')
        .select('stock')
        .eq('id', line.itemId)
        .single();
      if (cur) {
        const newStock = Math.max(0, (cur.stock || 0) - line.qty);
        await supabase.from('inventory').update({ stock: newStock }).eq('id', line.itemId);
      }
    }
  }

  return mapInvoice(invRow as InvoiceRow, inv.lines);
}

export const createInvoice = insertInvoice;

export async function getNextInvoiceNumber(approxCount?: number): Promise<string> {
  const maxDb = await getMaxInvoiceNumberFromDB();
  const nextNum = Math.max(maxDb, approxCount ?? 0) + 1;
  return `INV-${String(nextNum).padStart(4, '0')}`;
}

// ---- Profiles (Users) ----
export async function getAllProfiles(): Promise<ProfileRow[]> {
  const primaryRes = await supabase
    .from('profiles')
    .select('id, name, role, created_at, email, is_blocked')
    .order('created_at', { ascending: true });

  if (primaryRes.error) {
    // Fallback if is_blocked does not exist yet on remote table
    const fallbackRes = await supabase
      .from('profiles')
      .select('id, name, role, created_at, email')
      .order('created_at', { ascending: true });

    if (fallbackRes.error) throw fallbackRes.error;
    return (fallbackRes.data as ProfileRow[]) ?? [];
  }

  return (primaryRes.data as ProfileRow[]) ?? [];
}

export async function updateProfileRole(userId: string, role: 'admin' | 'sales'): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) throw error;
}

export async function toggleBlockProfile(userId: string, isBlocked: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ is_blocked: isBlocked }).eq('id', userId);
  if (error) throw error;
}

export async function deleteProfile(userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) throw error;
}

export async function insertProfileDirect(profile: {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'sales';
}): Promise<ProfileRow> {
  const newProfile: ProfileRow = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    created_at: new Date().toISOString(),
    is_blocked: false,
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(newProfile)
    .select('*')
    .single();

  if (error) throw error;
  return data as ProfileRow;
}

// ---- Vehicles ----
export async function insertVehicle(v: Omit<Vehicle, 'id' | 'createdAt'>): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      name: v.name,
      plate_number: v.plateNumber,
      type: v.type,
      model: v.model,
      status: v.status,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapVehicle(data as VehicleRow);
}

export async function updateVehicle(id: string, patch: Partial<Vehicle>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.plateNumber !== undefined) row.plate_number = patch.plateNumber;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.model !== undefined) row.model = patch.model;
  if (patch.status !== undefined) row.status = patch.status;

  const { error } = await supabase.from('vehicles').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw error;
}

// ---- Trips ----
export async function insertTrip(t: Omit<Trip, 'id' | 'createdAt' | 'items' | 'totalSales'> & { totalSales?: number }): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .insert({
      driver_name: t.driverName,
      vehicle: t.vehicle,
      vehicle_id: isValidUuid(t.vehicleId) ? t.vehicleId : null,
      departure_at: t.departureAt,
      return_at: t.returnAt ?? null,
      status: t.status,
      total_sales: t.totalSales ?? 0,
      city: t.city,
      area: t.area,
      notes: t.notes ?? null,
      created_by: t.createdBy ?? null,
      created_by_name: t.createdByName ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapTrip(data as TripRow, []);
}

export async function updateTrip(id: string, patch: Partial<Trip>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.driverName !== undefined) row.driver_name = patch.driverName;
  if (patch.vehicle !== undefined) row.vehicle = patch.vehicle;
  if (patch.vehicleId !== undefined) row.vehicle_id = isValidUuid(patch.vehicleId) ? patch.vehicleId : null;
  if (patch.departureAt !== undefined) row.departure_at = patch.departureAt;
  if (patch.returnAt !== undefined) row.return_at = patch.returnAt ?? null;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.totalSales !== undefined) row.total_sales = patch.totalSales;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.area !== undefined) row.area = patch.area;
  if (patch.notes !== undefined) row.notes = patch.notes;

  const { error } = await supabase.from('trips').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteTrip(id: string): Promise<void> {
  const { error: itemsErr } = await supabase.from('trip_items').delete().eq('trip_id', id);
  if (itemsErr) console.warn('Trip items delete warning:', itemsErr);
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) throw error;
}

export async function insertTripItem(
  tripId: string,
  item: InventoryItem,
  qty: number,
  unitPrice?: number,
): Promise<TripItem> {
  const { data, error } = await supabase
    .from('trip_items')
    .insert({
      trip_id: tripId,
      item_id: item.id,
      oem: item.oem,
      description: item.description,
      loaded_qty: qty,
      sold_qty: 0,
      returned_qty: 0,
      unit_price: unitPrice ?? item.sellPrice,
      unit_cost: item.purchasePrice,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapTripItem(data as TripItemRow);
}

export async function updateTripItem(id: string, patch: Partial<TripItem>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.loadedQty !== undefined) row.loaded_qty = patch.loadedQty;
  if (patch.soldQty !== undefined) row.sold_qty = patch.soldQty;
  if (patch.returnedQty !== undefined) row.returned_qty = patch.returnedQty;
  if (patch.unitPrice !== undefined) row.unit_price = patch.unitPrice;
  if (patch.unitCost !== undefined) row.unit_cost = patch.unitCost;

  const { error } = await supabase.from('trip_items').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteTripItem(id: string): Promise<void> {
  const { error } = await supabase.from('trip_items').delete().eq('id', id);
  if (error) throw error;
}

export async function recordTripSale(tripItemId: string, qty: number): Promise<{
  soldQty: number;
  remainingQty: number;
  inventoryStock: number;
  tripTotalSales: number;
}> {
  const { data, error } = await supabase.rpc('record_trip_sale', {
    p_trip_item_id: tripItemId,
    p_quantity: qty,
  });

  if (error) {
    // Fallback if RPC is not present: manual update
    const { data: ti, error: tiErr } = await supabase
      .from('trip_items')
      .select('*')
      .eq('id', tripItemId)
      .single();
    if (tiErr) throw tiErr;

    const newSold = (ti.sold_qty || 0) + qty;
    await supabase.from('trip_items').update({ sold_qty: newSold }).eq('id', tripItemId);

    const saleAmount = qty * (ti.unit_price || 0);
    const { data: trip } = await supabase.from('trips').select('total_sales').eq('id', ti.trip_id).single();
    const newTotal = (Number(trip?.total_sales) || 0) + saleAmount;
    await supabase.from('trips').update({ total_sales: newTotal }).eq('id', ti.trip_id);

    const { data: inv } = await supabase.from('inventory').select('stock').eq('id', ti.item_id).single();

    return {
      soldQty: newSold,
      remainingQty: Math.max(0, (ti.loaded_qty || 0) - newSold - (ti.returned_qty || 0)),
      inventoryStock: inv?.stock || 0,
      tripTotalSales: newTotal,
    };
  }

  const r = (data as unknown[])[0] as {
    sold_qty: number;
    remaining_qty: number;
    inventory_stock: number;
    trip_total_sales: number;
  };
  return {
    soldQty: r.sold_qty,
    remainingQty: r.remaining_qty,
    inventoryStock: r.inventory_stock,
    tripTotalSales: r.trip_total_sales,
  };
}

export async function recordTripReturn(tripItemId: string, qty: number): Promise<{
  returnedQty: number;
  remainingQty: number;
}> {
  const { data, error } = await supabase.rpc('record_trip_return', {
    p_trip_item_id: tripItemId,
    p_quantity: qty,
  });

  if (error) {
    // Fallback if RPC is not present
    const { data: ti, error: tiErr } = await supabase
      .from('trip_items')
      .select('*')
      .eq('id', tripItemId)
      .single();
    if (tiErr) throw tiErr;

    const newReturned = (ti.returned_qty || 0) + qty;
    await supabase.from('trip_items').update({ returned_qty: newReturned }).eq('id', tripItemId);

    return {
      returnedQty: newReturned,
      remainingQty: Math.max(0, (ti.loaded_qty || 0) - (ti.sold_qty || 0) - newReturned),
    };
  }

  const r = (data as unknown[])[0] as {
    returned_qty: number;
    remaining_qty: number;
  };
  return {
    returnedQty: r.returned_qty,
    remainingQty: r.remaining_qty,
  };
}

// ---- Capital & Expense Transactions ----
export async function insertCapitalTransaction(
  tx: Omit<CapitalTransaction, 'id' | 'createdAt'>
): Promise<CapitalTransaction> {
  const safeVehicleId = isValidUuid(tx.vehicleId) ? tx.vehicleId : null;

  const insertPayload = {
    type: tx.type,
    category: tx.category || '',
    amount: tx.amount,
    date: tx.date,
    description: tx.description || '',
    vehicle_id: safeVehicleId,
    vehicle_name: tx.vehicleName || '',
    balance_before: tx.balanceBefore,
    balance_after: tx.balanceAfter,
    total_capital_before: tx.totalCapitalBefore ?? 0,
    total_capital_after: tx.totalCapitalAfter ?? 0,
    created_by: tx.createdBy || '',
    created_by_name: tx.createdByName || '',
  };

  try {
    const { data, error } = await supabase
      .from('capital_transactions')
      .insert(insertPayload)
      .select('*')
      .single();

    if (!error && data) {
      return mapCapitalTransaction(data as CapitalTransactionRow);
    }

    if (error) {
      console.warn('Supabase insert capital_transaction initial attempt warning:', error);
      
      // Fallback 1: in case vehicle_id foreign key or total_capital columns mismatch
      const fallbackPayload = {
        type: tx.type,
        category: tx.category || '',
        amount: tx.amount,
        date: tx.date,
        description: tx.description || '',
        vehicle_name: tx.vehicleName || '',
        balance_before: tx.balanceBefore,
        balance_after: tx.balanceAfter,
        created_by: tx.createdBy || '',
        created_by_name: tx.createdByName || '',
      };

      const { data: fbData, error: fbErr } = await supabase
        .from('capital_transactions')
        .insert(fallbackPayload)
        .select('*')
        .single();

      if (!fbErr && fbData) {
        return mapCapitalTransaction(fbData as CapitalTransactionRow);
      }

      if (fbErr) {
        console.error('Supabase insert capital_transaction failed on Supabase remote database:', fbErr);
      }
    }
  } catch (err) {
    console.error('Supabase insert capital_transaction exception:', err);
  }

  // Fallback to local memory if remote table is unreachable
  return {
    id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: tx.type,
    category: tx.category,
    amount: tx.amount,
    date: tx.date,
    description: tx.description,
    vehicleId: tx.vehicleId,
    vehicleName: tx.vehicleName,
    balanceBefore: tx.balanceBefore,
    balanceAfter: tx.balanceAfter,
    totalCapitalBefore: tx.totalCapitalBefore,
    totalCapitalAfter: tx.totalCapitalAfter,
    createdBy: tx.createdBy,
    createdByName: tx.createdByName,
    createdAt: new Date().toISOString(),
  };
}

export async function updateCapitalTransaction(
  id: string,
  patch: Partial<CapitalTransaction>
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.category !== undefined) row.category = patch.category || '';
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.description !== undefined) row.description = patch.description || '';
  if (patch.vehicleId !== undefined) {
    row.vehicle_id = isValidUuid(patch.vehicleId) ? patch.vehicleId : null;
  }
  if (patch.vehicleName !== undefined) row.vehicle_name = patch.vehicleName || '';
  if (patch.balanceBefore !== undefined) row.balance_before = patch.balanceBefore;
  if (patch.balanceAfter !== undefined) row.balance_after = patch.balanceAfter;
  if (patch.totalCapitalBefore !== undefined) row.total_capital_before = patch.totalCapitalBefore;
  if (patch.totalCapitalAfter !== undefined) row.total_capital_after = patch.totalCapitalAfter;

  try {
    const { error } = await supabase.from('capital_transactions').update(row).eq('id', id);
    if (error) console.warn('Supabase update capital_transaction notice:', error);
  } catch (err) {
    console.warn('Supabase update capital_transaction catch:', err);
  }
}

export async function deleteCapitalTransaction(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('capital_transactions').delete().eq('id', id);
    if (error) console.warn('Supabase delete capital_transaction notice:', error);
  } catch (err) {
    console.warn('Supabase delete capital_transaction catch:', err);
  }
}
