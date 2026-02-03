import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../App';
import { Page } from '../types';
import { SearchIcon, DashboardIcon, InventoryIcon, TransactionsIcon, AnalyticsIcon, SparklesIcon, LinkIcon, MonthlySalesIcon, MonthlyPurchasesIcon, UserIcon, SuppliersIcon } from './Icons';
import { globalSearch } from '../services/searchService';

// Define a type for search results
type SearchResult = 
    | { type: 'product'; data: any }
    | { type: 'page'; data: { id: Page; label: string; icon: React.ReactNode } }
    | { type: 'sale'; data: any }
    | { type: 'purchase'; data: any }
    | { type: 'customer'; data: any }
    | { type: 'supplier'; data: any };

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
    const { addToCart, setActivePage, cart } = useContext(AppContext);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

    useEffect(() => {
        const searchData = async () => {
            if (query.length > 1) {
                setIsLoading(true);
                try {
                    const backendResults = await globalSearch(query);
                    
                    // Add page results
                    const pageResults: SearchResult[] = searchablePages
                        .filter(p => p.label.toLowerCase().includes(query.toLowerCase()))
                        .map(p => ({ type: 'page', data: p }));
                    
                    const combinedResults = [...pageResults, ...backendResults].slice(0, 10);
                    setResults(combinedResults);
                    setIsOpen(true);
                } catch (error) {
                    console.error('Search failed:', error);
                    setResults([]);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
                setIsOpen(false);
            }
        };
        
        const timeoutId = setTimeout(searchData, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

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

    const handleAddToCart = (productData: any) => {
        const formattedProduct = {
            id: productData._id || productData.id,
            name: productData.name,
            hsnCode: productData.hsnCode || '',
            batches: productData.batches || []
        };
        
        const productInCart = cart.some(item => item.productId === formattedProduct.id);
        
        if (productInCart) {
            setActivePage('billing');
            showToast(`'${productData.name}' is already in cart. Opening billing...`);
        } else {
            addToCart(formattedProduct);
            setActivePage('billing');
            showToast(`'${productData.name}' added to cart!`);
        }
        
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
                                    return (
                                        <li key={key} className="border-b border-border last:border-b-0">
                                            <div className="flex justify-between items-center p-2 px-3 hover:bg-secondary/50">
                                                <div>
                                                    <p className="font-semibold text-foreground text-sm">{result.data.name}</p>
                                                    <p className="text-xs text-muted-foreground">Stock: {result.data.totalStock} | ₹{result.data.mrp?.toFixed(2) || '0.00'}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleAddToCart(result.data)}
                                                    className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 font-semibold"
                                                    disabled={result.data.totalStock === 0}
                                                >
                                                    {result.data.totalStock > 0 ? (cart.some(item => item.productId === (result.data._id || result.data.id)) ? 'View' : 'Add') : 'Out'}
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
                                                        <p className="font-semibold text-foreground text-sm">Sale: {result.data.customerName || 'N/A'}</p>
                                                        <p className="text-xs text-muted-foreground">ID: ...{(result.data._id || result.data.id)?.slice(-6)} • ₹{(result.data.total || 0).toFixed(2)}</p>
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
                                    return (
                                        <li key={key} className="border-b border-border last:border-b-0">
                                             <button onClick={handleNavigateToHistory} className="w-full text-left p-2 px-3 flex justify-between items-center hover:bg-secondary/50">
                                                <div className="flex items-center gap-3">
                                                    <MonthlyPurchasesIcon className="w-5 h-5 text-muted-foreground"/>
                                                    <div>
                                                        <p className="font-semibold text-foreground text-sm">Purchase: {result.data.supplierName || 'N/A'}</p>
                                                        <p className="text-xs text-muted-foreground">ID: ...{(result.data._id || result.data.id)?.slice(-6)} • ₹{(result.data.total || 0).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <span className="text-xs">View</span>
                                                    <LinkIcon className="w-4 h-4"/>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                case 'customer':
                                    return (
                                        <li key={key} className="border-b border-border last:border-b-0">
                                            <button onClick={() => handleNavigate('billing')} className="w-full text-left p-2 px-3 flex justify-between items-center hover:bg-secondary/50">
                                                <div className="flex items-center gap-3">
                                                    <UserIcon className="w-5 h-5 text-muted-foreground"/>
                                                    <div>
                                                        <p className="font-semibold text-foreground text-sm">Customer: {result.data.name}</p>
                                                        <p className="text-xs text-muted-foreground">Phone: {result.data.phoneNumber}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <span className="text-xs">Bill</span>
                                                    <LinkIcon className="w-4 h-4"/>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                case 'supplier':
                                    return (
                                        <li key={key} className="border-b border-border last:border-b-0">
                                            <button onClick={() => handleNavigate('suppliers')} className="w-full text-left p-2 px-3 flex justify-between items-center hover:bg-secondary/50">
                                                <div className="flex items-center gap-3">
                                                    <SuppliersIcon className="w-5 h-5 text-muted-foreground"/>
                                                    <div>
                                                        <p className="font-semibold text-foreground text-sm">Supplier: {result.data.name}</p>
                                                        <p className="text-xs text-muted-foreground">Contact: {result.data.contactPerson}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <span className="text-xs">View</span>
                                                    <LinkIcon className="w-4 h-4"/>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                default:
                                    return null;
                           }
                        })}
                    </ul>
                </div>
            )}
            {isOpen && isLoading && (
                <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 p-4">
                    <p className="text-center text-sm text-muted-foreground">Searching...</p>
                </div>
            )}
            {isOpen && !isLoading && results.length === 0 && query.length > 1 && (
                 <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 p-4">
                     <p className="text-center text-sm text-muted-foreground">No results found.</p>
                 </div>
            )}
        </div>
    );
};

export default GlobalSearch;