import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';
import { Product } from '../types';

type ExpiryFilter = 'expired' | 15 | 30 | 60 | 90;

const ExpiringMedicines: React.FC = () => {
    const { products } = useContext(AppContext);
    const [filter, setFilter] = useState<ExpiryFilter>(30);

    const expiringBatches = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return products.flatMap(product => 
            product.batches.map(batch => ({ ...batch, product }))
        );
    }, [products]);

    const filteredBatches = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (filter === 'expired') {
            return expiringBatches
                .filter(b => new Date(b.expiryDate) < today)
                .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
        }

        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + filter);

        return expiringBatches
            .filter(b => {
                const expiryDate = new Date(b.expiryDate);
                return expiryDate >= today && expiryDate <= futureDate;
            })
            .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    }, [expiringBatches, filter]);

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
        if (diffDays < 0) return { text: 'Expired', color: 'text-error' };
        if (diffDays === 0) return { text: 'Expires Today', color: 'text-error font-bold' };
        if (diffDays <= 30) return { text: `${diffDays} days left`, color: 'text-yellow-600 font-semibold' };
        return { text: `${diffDays} days left`, color: 'text-muted-foreground' };
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-foreground">Expiring Medicines</h1>
                <div className="flex items-center space-x-2 bg-card p-1 rounded-lg border flex-wrap">
                    <FilterButton label="Expired" value="expired" />
                    <FilterButton label="In 15 Days" value={15} />
                    <FilterButton label="In 30 Days" value={30} />
                    <FilterButton label="In 60 Days" value={60} />
                    <FilterButton label="In 90 Days" value={90} />
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm text-left text-foreground">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border">
                        <tr>
                            <th scope="col" className="px-6 py-3 font-semibold border-r border-border">Description</th>
                            <th scope="col" className="px-6 py-3 font-semibold border-r border-border">Batch</th>
                            <th scope="col" className="px-6 py-3 font-semibold border-r border-border">Expiry Date</th>
                            <th scope="col" className="px-6 py-3 font-semibold border-r border-border">Days Remaining</th>
                            <th scope="col" className="px-6 py-3 font-semibold border-r border-border">Qty</th>
                            <th scope="col" className="px-6 py-3 font-semibold border-r border-border">Manufacturer</th>
                            <th scope="col" className="px-6 py-3 font-semibold">MRP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredBatches.map(b => {
                            const daysRemaining = getDaysRemaining(b.expiryDate);
                            return (
                                <tr key={b.id} className="hover:bg-secondary/50">
                                    <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">{b.product.name}</td>
                                    <td className="px-6 py-4">{b.batchNumber}</td>
                                    <td className="px-6 py-4">{b.expiryDate.split('-').reverse().join('-')}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap ${daysRemaining.color}`}>{daysRemaining.text}</td>
                                    <td className="px-6 py-4 font-bold">{b.stock}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{b.product.manufacturer}</td>
                                    <td className="px-6 py-4">₹{b.mrp.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredBatches.length === 0 && (
                    <p className="text-center py-12 text-muted-foreground">No products found for this filter.</p>
                )}
            </div>
        </div>
    );
};

export default ExpiringMedicines;