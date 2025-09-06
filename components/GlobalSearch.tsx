import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../App';
import { Product, Page, Transaction, Purchase } from '../types';
import { SearchIcon, DashboardIcon, InventoryIcon, TransactionsIcon, AnalyticsIcon, SparklesIcon, LinkIcon, MonthlySalesIcon, MonthlyPurchasesIcon } from './Icons';

// Define a type for search results
type SearchResult = 
    | { type: 'product'; data: Product }
    | { type: 'page'; data: { id: Page; label: string; icon: React.ReactNode } }
    | { type: 'sale'; data: Transaction }
    | { type: 'purchase'; data: Purchase };

// Define the list of searchable pages
const searchablePages: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon className="w-5 h-5 text-muted-foreground" /> },
    { id: 'inventory', label: 'Inventory', icon: <InventoryIcon className="w-5 h-5 text-muted-foreground" /> },
    { id: 'billing', label: 'New Bill', icon: <TransactionsIcon className="w-5 h-5 text-muted-foreground" /> },
    { id: 'transaction-history', label: 'Transaction History', icon: <TransactionsIcon className="w-5 h-5 text-muted-foreground" /> },
    { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon className="w-5 h-5 text-muted-foreground" /> },
    { id: 'gemini', label: 'AI Helper', icon: <SparklesIcon className="w-5 h-5 text-muted-foreground" /> },
];

const GlobalSearch: React.FC = () => {
    const { products, transactions, purchases, suppliers, addToCart, setActivePage } = useContext(AppContext);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

    useEffect(() => {
        if (query.length > 1) {
            const lowerCaseQuery = query.toLowerCase();
            
            // Filter products
            const productResults: SearchResult[] = products
                .filter(p =>
                    p.name.toLowerCase().includes(lowerCaseQuery) ||
                    p.manufacturer.toLowerCase().includes(lowerCaseQuery) ||
                    // FIX: Check for batchNumber inside the batches array.
                    p.batches.some(b => b.batchNumber.toLowerCase().includes(lowerCaseQuery))
                )
                .map(p => ({ type: 'product', data: p }));

            // Filter pages
            const pageResults: SearchResult[] = searchablePages
                .filter(p => p.label.toLowerCase().includes(lowerCaseQuery))
                .map(p => ({ type: 'page', data: p }));

            // Filter sales (transactions)
            const saleResults: SearchResult[] = transactions
                .filter(t =>
                    t.id.toLowerCase().includes(lowerCaseQuery) ||
                    (t.customerName && t.customerName.toLowerCase().includes(lowerCaseQuery))
                )
                .map(t => ({ type: 'sale', data: t }));
            
            // Filter purchases
            const purchaseResults: SearchResult[] = purchases
                .filter(p => {
                    const supplier = suppliers.find(s => s.id === p.supplierId);
                    return p.id.toLowerCase().includes(lowerCaseQuery) ||
                    (supplier && supplier.name.toLowerCase().includes(lowerCaseQuery))
                })
                .map(p => ({ type: 'purchase', data: p }));
            
            // Combine and limit results
            const combinedResults = [...pageResults, ...productResults, ...saleResults, ...purchaseResults].slice(0, 10);
            
            setResults(combinedResults);
            setIsOpen(true);
        } else {
            setResults([]);
            setIsOpen(false);
        }
    }, [query, products, transactions, purchases, suppliers]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const showToast = (message: string) => {
        setToast({ show: true, message });
        setTimeout(() => {
            setToast({ show: false, message: '' });
        }, 2000);
    };

    const handleAddToCart = (product: Product) => {
        addToCart(product);
        showToast(`'${product.name}' added to cart!`);
        setQuery('');
        setIsOpen(false);
    };
    
    const handleNavigate = (pageId: Page) => {
        setActivePage(pageId);
        setQuery('');
        setIsOpen(false);
    };

    const handleNavigateToHistory = () => {
        setActivePage('transaction-history');
        setQuery('');
        setIsOpen(false);
    };

    return (
        <div ref={searchRef} className="relative w-full max-w-md">
             {toast.show && (
                <div className="absolute top-14 right-0 bg-success text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-lg animate-pulse">
                    {toast.message}
                </div>
            )}
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search products, pages, transactions..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length > 1 && setIsOpen(true)}
                    className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring transition-all"
                />
            </div>
            {isOpen && results.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    <ul>
                        {results.map((result, index) => {
                           const key = `${result.type}-${result.data.id}-${index}`;
                           switch (result.type) {
                                case 'product':
                                    // FIX: Calculate totalStock and get MRP from an available batch.
                                    const totalStock = result.data.batches.reduce((sum, b) => sum + b.stock, 0);
                                    const firstBatchWithStock = result.data.batches.find(b => b.stock > 0);
                                    const mrp = firstBatchWithStock ? firstBatchWithStock.mrp : 0;
                                    return (
                                        <li key={key} className="border-b border-border last:border-b-0">
                                            <div className="flex justify-between items-center p-2 px-3 hover:bg-secondary/50">
                                                <div>
                                                    <p className="font-semibold text-foreground text-sm">{result.data.name}</p>
                                                    <p className="text-xs text-muted-foreground">Stock: {totalStock} | ₹{mrp.toFixed(2)}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleAddToCart(result.data)}
                                                    className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 font-semibold"
                                                    disabled={totalStock === 0}
                                                >
                                                    {totalStock > 0 ? 'Add' : 'Out'}
                                                </button>
                                            </div>
                                        </li>
                                    );
                                case 'page':
                                    return (
                                        <li key={key} className="border-b border-border last:border-b-0">
                                            <button onClick={() => handleNavigate(result.data.id)} className="w-full text-left p-2 px-3 flex justify-between items-center hover:bg-secondary/50">
                                                <div className="flex items-center gap-3">
                                                    {result.data.icon}
                                                    <p className="font-semibold text-foreground text-sm">{result.data.label}</p>
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                <span className="text-xs">Go to page</span>
                                                <LinkIcon className="w-4 h-4" />
                                                </div>
                                            </button>
                                        </li>
                                    );
                                case 'sale':
                                    return (
                                        <li key={key} className="border-b border-border last:border-b-0">
                                            <button onClick={handleNavigateToHistory} className="w-full text-left p-2 px-3 flex justify-between items-center hover:bg-secondary/50">
                                                <div className="flex items-center gap-3">
                                                    <MonthlySalesIcon className="w-5 h-5 text-muted-foreground"/>
                                                    <div>
                                                        <p className="font-semibold text-foreground text-sm">Sale: {result.data.customerName}</p>
                                                        <p className="text-xs text-muted-foreground">ID: ...{result.data.id.slice(-6)} &bull; ₹{result.data.total.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <span className="text-xs">View</span>
                                                    <LinkIcon className="w-4 h-4"/>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                case 'purchase':
                                    const supplierName = suppliers.find(s => s.id === result.data.supplierId)?.name || 'N/A';
                                    return (
                                        <li key={key} className="border-b border-border last:border-b-0">
                                             <button onClick={handleNavigateToHistory} className="w-full text-left p-2 px-3 flex justify-between items-center hover:bg-secondary/50">
                                                <div className="flex items-center gap-3">
                                                    <MonthlyPurchasesIcon className="w-5 h-5 text-muted-foreground"/>
                                                    <div>
                                                        <p className="font-semibold text-foreground text-sm">Purchase: {supplierName}</p>
                                                        <p className="text-xs text-muted-foreground">ID: ...{result.data.id.slice(-6)} &bull; ₹{result.data.total.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <span className="text-xs">View</span>
                                                    <LinkIcon className="w-4 h-4"/>
                                                </div>
                                            </button>
                                        </li>
                                    )
                                default:
                                    return null;
                           }
                        })}
                    </ul>
                </div>
            )}
            {isOpen && results.length === 0 && query.length > 1 && (
                 <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 p-4">
                     <p className="text-center text-sm text-muted-foreground">No results found.</p>
                 </div>
            )}
        </div>
    );
};

export default GlobalSearch;
