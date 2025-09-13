import React, { useState, createContext, useCallback, useContext } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Sell from './components/Billing';
import Reports from './components/Reports';
import GeminiHelper from './components/GeminiHelper';
import TransactionHistory from './components/TransactionHistory';
import ExpiringMedicines from './components/ExpiringMedicines';
import Suppliers from './components/Suppliers';
import Returns from './components/Returns';
import Vouchers from './components/Vouchers';
import PurchaseOrders from './components/PurchaseOrders';
import Ledgers from './components/Ledgers';
import { Page, Product, Transaction, Purchase, AppContextType, CartItem, InventoryFilter, TransactionFilter, GstSettings, Supplier, CustomerReturn, SupplierReturn, Voucher, CreditNote, JournalEntry, OrderListItem, PurchaseOrder, Customer } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { initialProducts, initialTransactions, initialPurchases, initialSuppliers, initialCustomers } from './data/mockData';

const initialInventoryFilter: InventoryFilter = { status: 'all' };
const initialTransactionFilter: TransactionFilter = { type: 'all', period: 'all' };

export const AppContext = createContext<AppContextType>({
    products: [],
    setProducts: () => {},
    transactions: [],
    setTransactions: () => {},
    purchases: [],
    setPurchases: () => {},
    suppliers: [],
    setSuppliers: () => {},
    customers: [],
    setCustomers: () => {},
    journal: [],
    addJournalEntry: () => {},
    activePage: 'dashboard',
    setActivePage: () => {},
    cart: [],
    addToCart: () => {},
    updateProductQuantityInCart: () => {},
    removeProductFromCart: () => {},
    clearCart: () => {},
    inventoryFilter: initialInventoryFilter,
    setInventoryFilter: () => {},
    transactionFilter: initialTransactionFilter,
    setTransactionFilter: () => {},
    gstSettings: { subsidized: 5, general: 12, food: 18 },
    setGstSettings: () => {},
    customerReturns: [],
    setCustomerReturns: () => {},
    supplierReturns: [],
    setSupplierReturns: () => {},
    vouchers: [],
    setVouchers: () => {},
    creditNotes: [],
    setCreditNotes: () => {},
    orderList: [],
    setOrderList: () => {},
    purchaseOrders: [],
    setPurchaseOrders: () => {},
    returnInitiationData: null,
    setReturnInitiationData: () => {},
    findOrCreateCustomer: () => ({ id: '', name: '', contact: '' }),
});

const SettingsPage: React.FC = () => {
    const { gstSettings, setGstSettings } = useContext(AppContext);
    const [localSettings, setLocalSettings] = useState<GstSettings>(gstSettings);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setGstSettings(localSettings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({...prev, [name]: parseFloat(value) || 0 }));
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-foreground mb-6">Settings</h1>
            <div className="max-w-2xl mx-auto">
                <div className="bg-card border border-border p-6 rounded-xl">
                    <h2 className="text-xl font-semibold text-foreground mb-4">GST Settings</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Government Subsidized GST Rate (%)</label>
                            <input type="number" name="subsidized" value={localSettings.subsidized} onChange={handleInputChange} className="w-full p-3 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">General GST Rate (%)</label>
                            <input type="number" name="general" value={localSettings.general} onChange={handleInputChange} className="w-full p-3 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Food Type GST Rate (%)</label>
                            <input type="number" name="food" value={localSettings.food} onChange={handleInputChange} className="w-full p-3 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring" />
                        </div>
                    </div>
                    <div className="flex justify-end mt-6">
                        <button onClick={handleSave} className={`px-5 py-2.5 rounded-lg font-semibold shadow-md transition-colors ${saved ? 'bg-success text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
                           {saved ? 'Saved!' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [activePage, setActivePage] = useState<Page>('dashboard');
    const [products, setProducts] = useLocalStorage<Product[]>('products', initialProducts);
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', initialTransactions);
    const [purchases, setPurchases] = useLocalStorage<Purchase[]>('purchases', initialPurchases);
    const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('suppliers', initialSuppliers);
    const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', initialCustomers);
    const [journal, setJournal] = useLocalStorage<JournalEntry[]>('journal', []);
    const [cart, setCart] = useLocalStorage<CartItem[]>('cart', []);
    const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>(initialInventoryFilter);
    const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>(initialTransactionFilter);
    const [gstSettings, setGstSettings] = useLocalStorage<GstSettings>('gstSettings', { subsidized: 5, general: 12, food: 18 });
    const [customerReturns, setCustomerReturns] = useLocalStorage<CustomerReturn[]>('customerReturns', []);
    const [supplierReturns, setSupplierReturns] = useLocalStorage<SupplierReturn[]>('supplierReturns', []);
    const [vouchers, setVouchers] = useLocalStorage<Voucher[]>('vouchers', []);
    const [creditNotes, setCreditNotes] = useLocalStorage<CreditNote[]>('creditNotes', []);
    const [orderList, setOrderList] = useLocalStorage<OrderListItem[]>('orderList', []);
    const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', []);
    const [returnInitiationData, setReturnInitiationData] = useState<{ productId: string; batchId: string } | null>(null);

    const addJournalEntry = useCallback((entry: Omit<JournalEntry, 'id'>) => {
        const totalDebits = entry.transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
        const totalCredits = entry.transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);

        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            console.error("Journal entry is not balanced!", {entry, totalDebits, totalCredits});
            // In a real app, you'd show an error to the user.
            return;
        }

        const newEntry: JournalEntry = {
            ...entry,
            id: `JE-${entry.referenceType.toUpperCase()}-${Date.now()}`
        };
        setJournal(prev => [...prev, newEntry]);
    }, [setJournal]);

    const findOrCreateCustomer = useCallback((name: string, contact: string): Customer => {
        if (!name.trim()) {
            return { id: 'CUST-WALKIN', name: 'Walk-in Customer', contact: '' };
        }
        
        const existingCustomer = customers.find(c => c.name.toLowerCase() === name.toLowerCase().trim());
        if (existingCustomer) {
            return existingCustomer;
        }
        
        const newCustomer: Customer = {
            id: `CUST-${Date.now()}`,
            name: name.trim(),
            contact: contact.trim()
        };
        setCustomers(prev => [...prev, newCustomer]);
        return newCustomer;

    }, [customers, setCustomers]);
    
    const updateProductQuantityInCart = useCallback((productId: string, totalQuantity: number) => {
        setCart(prevCart => {
            const product = products.find(p => p.id === productId);
            if (!product) return prevCart;
    
            // Remove existing items for this product from cart
            const otherItemsInCart = prevCart.filter(item => item.productId !== productId);
    
            if (totalQuantity <= 0) {
                return otherItemsInCart;
            }
    
            // Get all available batches for the product, sorted by expiry (FIFO)
            const availableBatches = product.batches
                .filter(b => b.stock > 0)
                .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    
            const totalStock = availableBatches.reduce((sum, b) => sum + b.stock, 0);
            let quantityToFulfill = Math.min(totalQuantity, totalStock);
    
            if (totalQuantity > totalStock) {
                console.warn(`Requested quantity ${totalQuantity} for ${product.name} exceeds total stock of ${totalStock}. Fulfilling with available stock.`);
            }
    
            const newCartItemsForProduct: CartItem[] = [];
            let remainingQuantity = quantityToFulfill;
    
            for (const batch of availableBatches) {
                if (remainingQuantity <= 0) break;
    
                const quantityFromThisBatch = Math.min(remainingQuantity, batch.stock);
                
                const taxRate = product.hsnCode.startsWith('3004') ? gstSettings.general : product.hsnCode.startsWith('2106') ? gstSettings.food : gstSettings.subsidized;

                newCartItemsForProduct.push({
                    productId: product.id,
                    productName: product.name,
                    quantity: quantityFromThisBatch,
                    price: batch.mrp,
                    tax: taxRate,
                    batchId: batch.id,
                });
    
                remainingQuantity -= quantityFromThisBatch;
            }
    
            return [...otherItemsInCart, ...newCartItemsForProduct];
        });
    }, [products, setCart, gstSettings]);

    const addToCart = useCallback((product: Product) => {
        const productInCart = cart.some(item => item.productId === product.id);
        if (productInCart) {
            // If product is already in cart, do nothing to prevent adding duplicates from search.
            // User can adjust quantity directly in the cart.
            return;
        }
        // Add product with a quantity of 1 unit.
        updateProductQuantityInCart(product.id, 1);
    }, [cart, updateProductQuantityInCart]);


    const removeProductFromCart = useCallback((productId: string) => {
        setCart(prevCart => prevCart.filter(item => item.productId !== productId));
    }, [setCart]);

    const clearCart = useCallback(() => {
        setCart([]);
    }, [setCart]);

    const renderPage = () => {
        switch (activePage) {
            case 'dashboard':
                return <Dashboard />;
            case 'inventory':
                return <Inventory />;
            case 'purchase-orders':
                return <PurchaseOrders />;
            case 'billing':
                return <Sell />;
            case 'transaction-history':
                return <TransactionHistory />;
            case 'analytics':
                return <Reports />;
            case 'gemini':
                return <GeminiHelper />;
            case 'expiring':
                return <ExpiringMedicines />;
            case 'suppliers':
                return <Suppliers />;
            case 'returns':
                return <Returns />;
            case 'vouchers':
                return <Vouchers />;
            case 'ledgers':
                return <Ledgers />;
            case 'settings':
                return <SettingsPage />;
            default:
                return <Dashboard />;
        }
    };
    
    const contextValue = {
        products, setProducts,
        transactions, setTransactions,
        purchases, setPurchases,
        suppliers, setSuppliers,
        customers, setCustomers,
        journal, addJournalEntry,
        activePage, setActivePage,
        cart, addToCart, updateProductQuantityInCart, removeProductFromCart, clearCart,
        inventoryFilter, setInventoryFilter,
        transactionFilter, setTransactionFilter,
        gstSettings, setGstSettings,
        customerReturns, setCustomerReturns,
        supplierReturns, setSupplierReturns,
        vouchers, setVouchers,
        creditNotes, setCreditNotes,
        orderList, setOrderList,
        purchaseOrders, setPurchaseOrders,
        returnInitiationData, setReturnInitiationData,
        findOrCreateCustomer,
    };

    return (
        <AppContext.Provider value={contextValue}>
            <div className="flex h-screen bg-secondary text-foreground p-4 gap-4">
                <Sidebar activePage={activePage} setActivePage={setActivePage} />
                <main className="flex-1 bg-card rounded-xl shadow-sm overflow-y-auto border border-border">
                    {renderPage()}
                </main>
            </div>
        </AppContext.Provider>
    );
};

export default App;