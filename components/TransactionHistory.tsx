import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../App';
import { Transaction, Purchase, TransactionFilterType } from '../types';

type CombinedTransaction = (Transaction | Purchase) & { type: 'Sale' | 'Purchase' };

const TransactionHistory: React.FC = () => {
    const { transactions, purchases, transactionFilter, setTransactionFilter, suppliers } = useContext(AppContext);
    const [localFilter, setLocalFilter] = useState<TransactionFilterType>(transactionFilter.type);

    useEffect(() => {
        setLocalFilter(transactionFilter.type);
        return () => {
            if(transactionFilter.period === 'last_month') {
                setTransactionFilter({ ...transactionFilter, period: 'all' });
            }
        };
    }, []);

    useEffect(() => {
        setLocalFilter(transactionFilter.type);
    }, [transactionFilter.type])

    const handleFilterChange = (newFilter: TransactionFilterType) => {
        setLocalFilter(newFilter);
        setTransactionFilter({ type: newFilter, period: 'all' });
    };

    const allTransactions = useMemo(() => {
        const formattedSales: CombinedTransaction[] = transactions.map(t => ({...t, type: 'Sale' as const}));
        const formattedPurchases: CombinedTransaction[] = purchases.map(p => ({...p, type: 'Purchase' as const}));
        
        return [...formattedSales, ...formattedPurchases]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, purchases]);

    const filteredTransactions = useMemo(() => {
        let results = allTransactions;

        if (localFilter === 'sales') {
            results = results.filter(t => t.type === 'Sale');
        } else if (localFilter === 'purchases') {
            results = results.filter(t => t.type === 'Purchase');
        }

        if (transactionFilter.period === 'last_month') {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            results = results.filter(t => new Date(t.date) >= oneMonthAgo);
        }

        return results;
    }, [allTransactions, localFilter, transactionFilter.period]);

    const FilterButton: React.FC<{
        label: string;
        value: TransactionFilterType;
    }> = ({ label, value }) => (
        <button 
            onClick={() => handleFilterChange(value)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${localFilter === value ? 'bg-primary text-primary-foreground shadow' : 'bg-secondary hover:bg-secondary/80'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-foreground">Transaction History</h1>
                <div className="flex items-center space-x-2 bg-card p-1 rounded-lg border">
                    <FilterButton label="All" value="all" />
                    <FilterButton label="Sales" value="sales" />
                    <FilterButton label="Purchases" value="purchases" />
                </div>
            </div>
            
            {transactionFilter.period === 'last_month' && (
                 <div className="flex items-center gap-3 bg-accent text-accent-foreground p-3 rounded-lg mb-6">
                    <span className="font-semibold text-sm">
                        Showing transactions from the last month.
                    </span>
                </div>
            )}

            <div className="bg-card rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm text-left text-foreground">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border">
                        <tr>
                            <th scope="col" className="px-6 py-3 font-semibold border-r border-border">Type</th>
                            <th scope="col" className="px-6 py-3 font-semibold border-r border-border">Transaction ID</th>
                            <th scope="col" className="px-6 py-3 font-semibold border-r border-border">Customer/Supplier</th>
                            <th scope="col" className="px-6 py-3 font-semibold border-r border-border">Date</th>
                            <th scope="col" className="px-6 py-3 font-semibold text-center border-r border-border">Items</th>
                            <th scope="col" className="px-6 py-3 font-semibold text-right">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-secondary/50">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full text-center ${t.type === 'Sale' ? 'bg-success/10 text-success' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {t.type.toUpperCase()}
                                    </span>
                                    {t.type === 'Purchase' && <span className="text-center text-xs mt-1 capitalize text-muted-foreground">({(t as Purchase).status})</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-muted-foreground text-xs">{t.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap font-medium">
                                    {t.type === 'Sale' 
                                        ? (t as Transaction).customerName 
                                        : (suppliers.find(s => s.id === (t as Purchase).supplierId)?.name || 'N/A')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(t.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</td>
                                <td className="px-6 py-4 text-center">{t.items.length}</td>
                                <td className="px-6 py-4 text-right font-bold text-lg">₹{t.total.toLocaleString('en-IN')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredTransactions.length === 0 && (
                    <p className="text-center py-12 text-muted-foreground">No transactions found for this filter.</p>
                )}
            </div>
        </div>
    );
};

export default TransactionHistory;