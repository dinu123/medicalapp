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
import { Page, Product, Transaction, Purchase, AppContextType, CartItem, InventoryFilter, TransactionFilter, GstSettings, Supplier, CustomerReturn, SupplierReturn, Voucher, CreditNote, LedgerEntry } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { initialProducts, initialTransactions, initialPurchases, initialSuppliers } from './data/mockData';

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
    activePage: 'dashboard',
    setActivePage: () => {},
    cart: [],
    addToCart: () => {},
    updateCartQuantity: () => {},
    removeFromCart: () => {},
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
    ledger: [],
    setLedger: () => {},
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
    const [cart, setCart] = useLocalStorage<CartItem[]>('cart', []);
    const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>(initialInventoryFilter);
    const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>(initialTransactionFilter);
    const [gstSettings, setGstSettings] = useLocalStorage<GstSettings>('gstSettings', { subsidized: 5, general: 12, food: 18 });
    const [customerReturns, setCustomerReturns] = useLocalStorage<CustomerReturn[]>('customerReturns', []);
    const [supplierReturns, setSupplierReturns] = useLocalStorage<SupplierReturn[]>('supplierReturns', []);
    const [vouchers, setVouchers] = useLocalStorage<Voucher[]>('vouchers', []);
    const [creditNotes, setCreditNotes] = useLocalStorage<CreditNote[]>('creditNotes', []);
    const [ledger, setLedger] = useLocalStorage<LedgerEntry[]>('ledger', []);


    const addToCart = useCallback((product: Product) => {
        // FIFO logic: find the batch with the soonest expiry date that has stock.
        const fifoBatch = product.batches
            .filter(b => b.stock > 0)
            .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0];

        if (!fifoBatch) {
            alert(`'${product.name}' is out of stock.`);
            return;
        }

        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.productId === product.id && item.batchId === fifoBatch.id);

            if (existingItem) {
                // If item is already in cart, do nothing.
                return prevCart;
            }
            
            const taxRate = product.hsnCode.startsWith('3004') ? gstSettings.general : product.hsnCode.startsWith('2106') ? gstSettings.food : gstSettings.subsidized;

            return [...prevCart, { 
                productId: product.id, 
                productName: product.name, 
                quantity: 0, // Add with 0 quantity
                price: fifoBatch.mrp, 
                tax: taxRate, 
                batchId: fifoBatch.id 
            }];
        });
    }, [setCart, gstSettings]);

    const updateCartQuantity = useCallback((productId: string, batchId: string, newQuantity: number) => {
        setCart(prevCart => {
            const product = products.find(p => p.id === productId);
            const batch = product?.batches.find(b => b.id === batchId);
            
            if (!batch) return prevCart;

            if (newQuantity > batch.stock) {
                alert(`Quantity cannot exceed available stock for this batch (${batch.stock})`);
                return prevCart.map(item => item.batchId === batchId ? { ...item, quantity: batch.stock } : item);
            }
            if (newQuantity < 0) return prevCart;
            
            return prevCart.map(item => item.batchId === batchId ? { ...item, quantity: newQuantity } : item);
        });
    }, [products, setCart]);

    const removeFromCart = useCallback((productId: string, batchId: string) => {
        setCart(prevCart => prevCart.filter(item => !(item.productId === productId && item.batchId === batchId)));
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
        activePage, setActivePage,
        cart, addToCart, updateCartQuantity, removeFromCart, clearCart,
        inventoryFilter, setInventoryFilter,
        transactionFilter, setTransactionFilter,
        gstSettings, setGstSettings,
        customerReturns, setCustomerReturns,
        supplierReturns, setSupplierReturns,
        vouchers, setVouchers,
        creditNotes, setCreditNotes,
        ledger, setLedger
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