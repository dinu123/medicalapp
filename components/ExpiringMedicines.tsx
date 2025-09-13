import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { Product, Batch } from '../types';
import { ActionsIcon, ExportIcon, XIcon, SearchIcon } from './Icons';

type ExpiryFilter = 'expired' | 15 | 30 | 60 | 90;

const SetDiscountModal: React.FC<{
    batch: Batch & { product: Product };
    onClose: () => void;
    onSave: (batchId: string, discount: number) => void;
}> = ({ batch, onClose, onSave }) => {
    const [discountPercent, setDiscountPercent] = useState(batch.saleDiscount || 0);
    
    const newSellingPrice = batch.mrp * (1 - discountPercent / 100);
    const isBelowCost = newSellingPrice < batch.price;

    const handleSave = () => {
        onSave(batch.id, discountPercent);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-card text-card-foreground rounded-xl p-6 w-full max-w-lg m-4 border border-border shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Set Sale Discount</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon /></button>
                </div>
                <div className="space-y-4">
                    <p><strong>Medicine:</strong> {batch.product.name}</p>
                    <p><strong>Batch:</strong> {batch.batchNumber}</p>
                    <div className="grid grid-cols-2 gap-4 p-3 bg-secondary rounded-lg">
                        <p><strong>MRP:</strong> ₹{batch.mrp.toFixed(2)}</p>
                        <p><strong>Purchase Price:</strong> ₹{batch.price.toFixed(2)}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Discount Percentage (%)</label>
                        <input
                            type="number"
                            value={discountPercent}
                            onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)}
                            className="w-full p-3 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring"
                            min="0"
                            max="100"
                        />
                    </div>
                    <div className="p-3 bg-secondary rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">New Selling Price</p>
                        <p className="text-2xl font-bold text-primary">₹{newSellingPrice.toFixed(2)}</p>
                    </div>
                    {isBelowCost && (
                        <div className="p-3 bg-amber-100 text-amber-800 text-sm rounded-lg text-center">
                            <strong>Warning:</strong> The new selling price is below the purchase price.
                        </div>
                    )}
                </div>
                <div className="flex justify-end space-x-3 pt-6 mt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold">Cancel</button>
                    <button type="button" onClick={handleSave} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md">Save Discount</button>
                </div>
            </div>
        </div>
    );
};

const ExpiringMedicines: React.FC = () => {
    const { products, setProducts, purchases, suppliers, setActivePage, setReturnInitiationData } = useContext(AppContext);
    const [filter, setFilter] = useState<ExpiryFilter>(30);
    const [searchTerm, setSearchTerm] = useState('');
    const [openActionsMenu, setOpenActionsMenu] = useState<string | null>(null);
    const actionsMenuRef = useRef<HTMLDivElement>(null);
    const [batchToDiscount, setBatchToDiscount] = useState<(Batch & {product: Product}) | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
                setOpenActionsMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const batchToSupplierMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const purchase of purchases) {
            const supplier = suppliers.find(s => s.id === purchase.supplierId);
            if (supplier) {
                for (const item of purchase.items) {
                    map.set(item.batchId, supplier.name);
                }
            }
        }
        return map;
    }, [purchases, suppliers]);

    const expiringBatches = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return products.flatMap(product => 
            product.batches
            .filter(batch => batch.stock > 0)
            .map(batch => ({ ...batch, product, supplierName: batchToSupplierMap.get(batch.id) || 'N/A' }))
        );
    }, [products, batchToSupplierMap]);

    const filteredBatches = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let dateFilteredBatches;

        if (filter === 'expired') {
            dateFilteredBatches = expiringBatches
                .filter(b => new Date(b.expiryDate) < today)
                .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
        } else {
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + filter);

            dateFilteredBatches = expiringBatches
                .filter(b => {
                    const expiryDate = new Date(b.expiryDate);
                    return expiryDate >= today && expiryDate <= futureDate;
                })
                .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
        }

        if (!searchTerm) {
            return dateFilteredBatches;
        }

        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return dateFilteredBatches.filter(b => 
            b.product.name.toLowerCase().includes(lowerCaseSearchTerm) ||
            b.supplierName.toLowerCase().includes(lowerCaseSearchTerm) ||
            b.batchNumber.toLowerCase().includes(lowerCaseSearchTerm)
        );
    }, [expiringBatches, filter, searchTerm]);

    const FilterButton: React.FC<{ label: string; value: ExpiryFilter; }> = ({ label, value }) => (
        <button
            onClick={() => setFilter(value)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${filter === value ? 'bg-primary text-primary-foreground shadow' : 'bg-secondary hover:bg-secondary/80'}`}
        >
            {label}
        </button>
    );
    
    const getDaysRemaining = (expiry: string) => {
        const expiryDate = new Date(expiry);
        const today = new Date();
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return { text: 'Expired', color: 'text-red-600 font-bold' };
        if (diffDays === 0) return { text: 'Expires Today', color: 'text-red-600 font-bold' };
        if (diffDays <= 30) return { text: `${diffDays} days left`, color: 'text-red-600 font-bold' };
        return { text: `${diffDays} days left`, color: 'text-muted-foreground' };
    };
    
    const handleReturnToSupplier = (batch: Batch & { product: Product }) => {
        setReturnInitiationData({ productId: batch.product.id, batchId: batch.id });
        setActivePage('returns');
    };

    const handleSaveDiscount = (batchId: string, discount: number) => {
        setProducts(prevProducts => {
            return prevProducts.map(p => ({
                ...p,
                batches: p.batches.map(b => 
                    b.id === batchId ? { ...b, saleDiscount: discount } : b
                )
            }));
        });
    };

    const handleExport = () => {
        if (filteredBatches.length === 0) {
            alert("No data to export.");
            return;
        }

        const headers = ["Medicine Name", "Batch Number", "Expiry Date", "Days Remaining", "Stock", "Supplier", "MRP", "Purchase Price", "Sale Discount (%)"];
        
        const csvContent = [
            headers.join(','),
            ...filteredBatches.map(b => {
                const daysRemaining = getDaysRemaining(b.expiryDate).text;
                const rowData = [
                    `"${b.product.name.replace(/"/g, '""')}"`, `"${b.batchNumber}"`, `"${b.expiryDate}"`,
                    `"${daysRemaining}"`, b.stock, `"${b.supplierName.replace(/"/g, '""')}"`,
                    b.mrp.toFixed(2), b.price.toFixed(2), b.saleDiscount || 0
                ];
                return rowData.join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `expiring_medicines_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Expiring Medicines</h1>
                    <p className="text-muted-foreground mt-1">Manage near-expiry and expired stock.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleExport} className="flex items-center px-3 py-2 border border-border rounded-lg bg-secondary hover:bg-border/50 font-semibold text-sm">
                        <ExportIcon className="mr-2 h-4 w-4" /> Export
                    </button>
                    <div className="flex items-center space-x-2 bg-card p-1 rounded-lg border flex-wrap">
                        <FilterButton label="Expired" value="expired" />
                        <FilterButton label="In 15 Days" value={15} />
                        <FilterButton label="In 30 Days" value={30} />
                        <FilterButton label="In 60 Days" value={60} />
                        <FilterButton label="In 90 Days" value={90} />
                    </div>
                </div>
            </div>
            
            <div className="relative mb-6">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by medicine name, supplier, or batch..."
                    className="w-full max-w-lg p-2.5 pl-10 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring"
                    aria-label="Search expiring medicines"
                />
            </div>

            <div className="bg-card rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm text-left text-foreground">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border">
                        <tr>
                            <th scope="col" className="px-6 py-3 font-semibold">Description</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Batch</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Supplier</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Expiry Date</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Days Remaining</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Qty</th>
                            <th scope="col" className="px-6 py-3 font-semibold">MRP</th>
                            <th scope="col" className="px-6 py-3 font-semibold text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredBatches.map(b => {
                            const daysRemaining = getDaysRemaining(b.expiryDate);
                            return (
                                <tr key={b.id} className="hover:bg-secondary/50">
                                    <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">{b.product.name}</td>
                                    <td className="px-6 py-4">{b.batchNumber}</td>
                                    <td className="px-6 py-4">{b.supplierName}</td>
                                    <td className="px-6 py-4">{b.expiryDate.split('-').reverse().join('-')}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap ${daysRemaining.color}`}>{daysRemaining.text}</td>
                                    <td className="px-6 py-4 font-bold">{b.stock}</td>
                                    <td className="px-6 py-4">₹{b.mrp.toFixed(2)}</td>
                                    <td className="px-6 py-4 relative text-center">
                                        <button onClick={(e) => { e.stopPropagation(); setOpenActionsMenu(b.id === openActionsMenu ? null : b.id); }} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-border">
                                            <ActionsIcon />
                                        </button>
                                        {openActionsMenu === b.id && (
                                            <div ref={actionsMenuRef} className="absolute right-8 mt-2 w-48 bg-card border border-border rounded-lg shadow-xl z-20">
                                                <ul className="py-1">
                                                    <li><button onClick={() => { handleReturnToSupplier(b); setOpenActionsMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary">Return to Supplier</button></li>
                                                    <li><button onClick={() => { setBatchToDiscount(b); setOpenActionsMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary">Set Sale Discount</button></li>
                                                </ul>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredBatches.length === 0 && (
                    <p className="text-center py-12 text-muted-foreground">No products found for this filter.</p>
                )}
            </div>
            {batchToDiscount && (
                <SetDiscountModal 
                    batch={batchToDiscount}
                    onClose={() => setBatchToDiscount(null)}
                    onSave={handleSaveDiscount}
                />
            )}
        </div>
    );
};

export default ExpiringMedicines;