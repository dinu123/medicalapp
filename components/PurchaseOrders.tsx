import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { ChevronDownIcon } from './Icons';
import { PurchaseOrder } from '../types';

const PurchaseOrders: React.FC = () => {
    const { purchaseOrders, suppliers } = useContext(AppContext);
    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    const toggleRow = (poId: string) => {
        setExpandedRows(prev =>
            prev.includes(poId)
                ? prev.filter(id => id !== poId)
                : [...prev, poId]
        );
    };

    const sortedPOs = [...purchaseOrders].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-foreground">Purchase Orders</h1>
            </div>

            <div className="bg-card rounded-xl border border-border">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-foreground min-w-[800px]">
                        <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                            <tr>
                                <th scope="col" className="px-2 py-3 w-12"></th>
                                <th scope="col" className="px-4 py-3 font-semibold">PO ID</th>
                                <th scope="col" className="px-4 py-3 font-semibold">Supplier</th>
                                <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-center">Items</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-right">Total Value</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPOs.map(po => {
                                const supplier = suppliers.find(s => s.id === po.supplierId);
                                const isExpanded = expandedRows.includes(po.id);
                                return (
                                    <React.Fragment key={po.id}>
                                        <tr
                                            className="border-t border-border hover:bg-secondary/30 cursor-pointer"
                                            onClick={() => toggleRow(po.id)}
                                            tabIndex={0}
                                            aria-expanded={isExpanded}
                                        >
                                            <td className="px-2 py-3 text-center">
                                                <button className="p-1 rounded-full hover:bg-border" aria-label={`Show items for PO ${po.id}`}>
                                                    <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">{po.id}</td>
                                            <td className="px-4 py-3 font-semibold">{supplier?.name || 'N/A'}</td>
                                            <td className="px-4 py-3">{new Date(po.createdDate).toLocaleDateString('en-GB')}</td>
                                            <td className="px-4 py-3 text-center">{po.items.length}</td>
                                            <td className="px-4 py-3 text-right font-bold">₹{po.totalValue.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700 capitalize">{po.status}</span>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-secondary/40">
                                                <td colSpan={7} className="p-3">
                                                    <div className="p-2 bg-card rounded-md border border-border">
                                                        <h4 className="font-bold mb-2 px-2">Items in PO-{po.id.slice(-6)}</h4>
                                                        <table className="w-full text-xs">
                                                            <thead className="text-muted-foreground">
                                                                <tr>
                                                                    <th className="px-3 py-2 font-semibold text-left">Product</th>
                                                                    <th className="px-3 py-2 font-semibold text-center">Qty</th>
                                                                    <th className="px-3 py-2 font-semibold text-right">Rate</th>
                                                                    <th className="px-3 py-2 font-semibold text-right">Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {po.items.map(item => (
                                                                    <tr key={item.productId} className="border-t border-border/50">
                                                                        <td className="px-3 py-2">
                                                                            <p className="font-semibold">{item.productName}</p>
                                                                            <p className="text-muted-foreground">{item.manufacturer}</p>
                                                                        </td>
                                                                        <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                                                                        <td className="px-3 py-2 text-right">₹{item.rate.toFixed(2)}</td>
                                                                        <td className="px-3 py-2 text-right">₹{(item.rate * item.quantity).toFixed(2)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                    {sortedPOs.length === 0 && (
                        <p className="text-center py-12 text-muted-foreground">No purchase orders have been created yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrders;