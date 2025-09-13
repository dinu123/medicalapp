export type MedicineSchedule = 'none' | 'H' | 'H1' | 'narcotic' | 'tb';
export type PurchaseStatus = 'paid' | 'credit';

export interface Batch {
  id: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  stock: number;
  mrp: number;
  price: number; // Rate
  discount: number; // Percentage
  saleDiscount?: number; // Percentage discount for expiring items
}

export interface Product {
  id: string;
  hsnCode: string;
  name: string; // Description
  pack: string;
  manufacturer: string;
  salts?: string;
  schedule?: MedicineSchedule;
  batches: Batch[];
  category?: string;
  minStock?: number;
  orderLater?: boolean;
  isOrdered?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  address: string;
  contact: string;
  gstin: string;
  dlNumber: string; // Drug License
  foodLicenseNumber: string;
  defaultDiscount: number; // Percentage
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  batchId: string;
}

export interface Transaction {
  id: string;
  customerName?: string;
  doctorName?: string;
  doctorRegNo?: string;
  isRghs?: boolean;
  items: TransactionItem[];
  total: number;
  date: string; // ISO string
  discountPercentage?: number;
  status: 'paid' | 'credit';
  paymentMethod?: 'Cash' | 'Card' | 'UPI';
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  batchId: string; // Links to the specific batch created
  quantity: number;
  price: number;
  amount: number;
}

export interface Purchase {
  id:string;
  supplierId: string;
  invoiceNumber?: string;
  items: PurchaseItem[];
  total: number;
  date: string; // ISO string
  status: PurchaseStatus;
  paymentMethod?: 'cash' | 'bank' | 'upi';
  notes?: string;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  batchId: string;
  quantity: number;
  price: number; // The price at which it was originally bought/sold
  discount: number; // The discount % applied at the time of original transaction
  amount: number; // Calculated return value for this item
}

export interface CustomerReturn {
  id: string; // e.g., 'RTN-CUST-16789'
  originalTransactionId: string;
  items: ReturnItem[];
  totalAmount: number;
  date: string; // ISO String
  settlement: {
    type: 'refund' | 'voucher';
    voucherId?: string;
  };
}

export interface SupplierReturn {
  id: string; // e.g., 'RTN-SUPP-16789'
  originalPurchaseId: string;
  supplierId: string;
  items: ReturnItem[];
  totalAmount: number;
  date: string; // ISO String
  settlement: {
    type: 'credit_note' | 'ledger_adjustment';
    creditNoteId?: string;
  };
}

export interface Voucher {
  id: string; // e.g., 'VCHR-CUST-1234'
  customerName?: string;
  initialAmount: number;
  balance: number;
  createdDate: string; // ISO String
  status: 'active' | 'used' | 'expired';
}

export interface CreditNote {
  id: string; // e.g., 'CN-SUPP-5678'
  supplierId: string;
  supplierReturnId: string;
  amount: number;
  date: string; // ISO String
  status: 'open' | 'applied';
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  relatedId: string; // ID of the transaction, return, voucher, etc.
}


export type Page = 'dashboard' | 'analytics' | 'billing' | 'transaction-history' | 'inventory' | 'gemini' | 'suppliers' | 'expiring' | 'tax' | 'profile' | 'settings' | 'returns' | 'vouchers' | 'purchase-orders';

export interface CartItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number; // This is the MRP from the batch
    tax: number; // This is the tax rate from the product master
    batchId: string;
}

export type InventoryFilterStatus = 'all' | 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired';
export type TransactionFilterType = 'all' | 'sales' | 'purchases';
export type TransactionFilterPeriod = 'all' | 'last_month';

export interface InventoryFilter {
    status: InventoryFilterStatus;
}

export interface TransactionFilter {
    type: TransactionFilterType;
    period: TransactionFilterPeriod;
}

export interface GstSettings {
  subsidized: number;
  general: number;
  food: number;
}

export interface OrderListItem {
  productId: string;
  productName: string;
  manufacturer: string;
  pack: string;
  selectedSupplierId: string;
  quantity: number;
  rate: number;
  mrp: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  items: OrderListItem[];
  createdDate: string; // ISO string
  status: 'ordered' | 'completed';
  totalValue: number;
}

export interface AppContextType {
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    purchases: Purchase[];
    setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
    suppliers: Supplier[];
    setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
    activePage: Page;
    setActivePage: (page: Page) => void;
    cart: CartItem[];
    addToCart: (product: Product) => void;
    updateCartQuantity: (productId: string, batchId: string, newQuantity: number) => void;
    removeFromCart: (productId: string, batchId: string) => void;
    clearCart: () => void;
    inventoryFilter: InventoryFilter;
    setInventoryFilter: (filter: InventoryFilter) => void;
    transactionFilter: TransactionFilter;
    setTransactionFilter: (filter: TransactionFilter) => void;
    gstSettings: GstSettings;
    setGstSettings: React.Dispatch<React.SetStateAction<GstSettings>>;
    customerReturns: CustomerReturn[];
    setCustomerReturns: React.Dispatch<React.SetStateAction<CustomerReturn[]>>;
    supplierReturns: SupplierReturn[];
    setSupplierReturns: React.Dispatch<React.SetStateAction<SupplierReturn[]>>;
    vouchers: Voucher[];
    setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>;
    creditNotes: CreditNote[];
    setCreditNotes: React.Dispatch<React.SetStateAction<CreditNote[]>>;
    ledger: LedgerEntry[];
    setLedger: React.Dispatch<React.SetStateAction<LedgerEntry[]>>;
    orderList: OrderListItem[];
    setOrderList: React.Dispatch<React.SetStateAction<OrderListItem[]>>;
    purchaseOrders: PurchaseOrder[];
    setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
    returnInitiationData: { productId: string; batchId: string } | null;
    setReturnInitiationData: React.Dispatch<React.SetStateAction<{ productId: string; batchId: string } | null>>;
}