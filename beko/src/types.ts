export type Role = 'admin' | 'sales';

export type PaymentMethod = 'cash' | 'bank' | 'credit' | 'mixed';

export interface User {
  id: string;
  name: string;
  role: Role;
  isBlocked?: boolean;
}

export interface Shop {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  city: string;
  area: string;
  openingBalance: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  shopId: string;
  amount: number;
  method: 'cash' | 'bank' | 'mixed';
  cashAmount?: number;
  bankAmount?: number;
  date: string;
  note?: string;
  createdBy: string;
}

export interface Shipment {
  id: string;
  ref: string;
  departureDate: string;
  arrivalDate: string;
  status: 'in_transit' | 'arrived' | 'cleared';
  totalCostCny: number;
  totalShippingCny: number;
  cnyToLydRate: number;
  itemCount: number;
}

export interface InventoryItem {
  id: string;
  oem: string;
  description: string;
  carModel: string;
  category: string;
  shelf: string;
  stock: number;
  minStock: number;
  purchasePrice: number;
  sellPrice: number;
  shipmentId?: string;
}

export interface InvoiceLine {
  itemId: string;
  oem: string;
  description: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  lineTotal: number;
  lineCost: number;
}

export interface Invoice {
  id: string;
  number: string;
  shopId: string;
  shopName: string;
  date: string;
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  total: number;
  totalCost: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  cashAmount?: number;
  bankAmount?: number;
  createdBy: string;
  createdByName: string;
  status: 'paid' | 'partial' | 'unpaid';
  tripId?: string;
  tripName?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  plateNumber: string;
  type: string;
  model: string;
  status: 'active' | 'maintenance' | 'inactive';
  createdAt: string;
}

export interface TripItem {
  id: string;
  tripId: string;
  itemId: string;
  oem: string;
  description: string;
  loadedQty: number;
  soldQty: number;
  returnedQty: number;
  unitPrice: number;
  unitCost: number;
}

export type TripStatus = 'pending_approval' | 'loading' | 'active' | 'completed' | 'cancelled' | 'rejected';

export interface Trip {
  id: string;
  driverName: string;
  vehicle: string;
  vehicleId?: string;
  departureAt: string;
  returnAt?: string;
  status: TripStatus;
  totalSales: number;
  city: string;
  area: string;
  notes: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  items: TripItem[];
}

export interface CapitalTransaction {
  id: string;
  type: 'capital_initial' | 'capital_injection' | 'expense';
  category: string;
  amount: number;
  date: string;
  description: string;
  vehicleId?: string;
  vehicleName?: string;
  balanceBefore: number;
  balanceAfter: number;
  totalCapitalBefore?: number;
  totalCapitalAfter?: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface AppData {
  shops: Shop[];
  payments: Payment[];
  shipments: Shipment[];
  inventory: InventoryItem[];
  invoices: Invoice[];
  vehicles: Vehicle[];
  trips: Trip[];
  capitalTransactions?: CapitalTransaction[];
}
