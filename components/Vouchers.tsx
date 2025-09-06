import React, { useContext } from 'react';
import { AppContext } from '../App';
import { VoucherIcon } from './Icons';

const Vouchers: React.FC = () => {
    const { vouchers } = useContext(AppContext);

    const sortedVouchers = [...vouchers].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());

    const getStatusChip = (status: 'active' | 'used' | 'expired') => {
        switch (status) {
            case 'active':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-success/10 text-success">ACTIVE</span>;
            case 'used':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-muted text-muted-foreground">USED</span>;
            case 'expired':
                return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-destructive/10 text-destructive">EXPIRED</span>;
            default:
                return null;
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
                <VoucherIcon className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">Voucher Records</h1>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm text-left text-foreground">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border">
                        <tr>
                            <th scope="col" className="px-6 py-3 font-semibold">Voucher ID</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Customer Name</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Issued Date</th>
                            <th scope="col" className="px-6 py-3 font-semibold text-right">Initial Amount</th>
                            <th scope="col" className="px-6 py-3 font-semibold text-right">Balance</th>
                            <th scope="col" className="px-6 py-3 font-semibold text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {sortedVouchers.map(v => (
                            <tr key={v.id} className="hover:bg-secondary/50">
                                <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{v.id}</td>
                                <td className="px-6 py-4 font-semibold">{v.customerName || 'N/A'}</td>
                                <td className="px-6 py-4">{new Date(v.createdDate).toLocaleDateString('en-GB')}</td>
                                <td className="px-6 py-4 text-right">₹{v.initialAmount.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right font-bold">₹{v.balance.toFixed(2)}</td>
                                <td className="px-6 py-4 text-center">{getStatusChip(v.status)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sortedVouchers.length === 0 && (
                    <p className="text-center py-12 text-muted-foreground">No vouchers have been issued yet.</p>
                )}
            </div>
        </div>
    );
};

export default Vouchers;
