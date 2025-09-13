import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../App';
import { JournalEntry, JournalTransaction, Customer, Supplier } from '../types';
import { XIcon } from './Icons';

type AccountType = 'Customer' | 'Supplier' | 'General';

interface LedgerAccount {
    id: string;
    name: string;
    type: AccountType;
    balance: number;
    balanceType: 'Dr' | 'Cr';
}

const RecordPaymentModal: React.FC<{
    accountId: string;
    accountName: string;
    accountType: 'Customer' | 'Supplier';
    onClose: () => void;
}> = ({ accountId, accountName, accountType, onClose }) => {
    const { addJournalEntry } = useContext(AppContext);
    const [amount, setAmount] = useState<number | ''>('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank'>('Bank');
    const [narration, setNarration] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }

        const referenceType = accountType === 'Customer' ? 'Receipt' : 'Payment';
        const defaultNarration = accountType === 'Customer'
            ? `Cash received from ${accountName}`
            : `Payment made to ${accountName}`;

        const transactions: [JournalTransaction, JournalTransaction] = accountType === 'Customer'
            ? [ // Receipt from Customer
                { accountId: paymentMethod === 'Cash' ? 'AC-CASH' : 'AC-BANK', accountName: `${paymentMethod} Account`, type: 'debit', amount },
                { accountId: accountId, accountName: accountName, type: 'credit', amount },
              ]
            : [ // Payment to Supplier
                { accountId: accountId, accountName: accountName, type: 'debit', amount },
                { accountId: paymentMethod === 'Cash' ? 'AC-CASH' : 'AC-BANK', accountName: `${paymentMethod} Account`, type: 'credit', amount },
              ];

        addJournalEntry({
            date,
            referenceId: `PMT-${Date.now()}`,
            referenceType,
            narration: narration || defaultNarration,
            transactions,
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-card text-card-foreground rounded-xl p-6 w-full max-w-lg m-4 border border-border shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Record {accountType === 'Customer' ? 'Receipt' : 'Payment'}</h2>
                    <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-muted-foreground mb-1">For</label>
                        <div className="w-full p-3 border border-border rounded-lg bg-secondary text-foreground font-bold">{accountName}</div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-muted-foreground mb-1">Amount</label>
                        <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || '')} required className="w-full p-3 border border-border rounded-lg bg-input" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-muted-foreground mb-1">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full p-3 border border-border rounded-lg bg-input" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-muted-foreground mb-1">Payment Method</label>
                        <div className="flex gap-2 rounded-lg bg-input p-1.5 border border-border w-full">
                            {(['Bank', 'Cash'] as const).map(m => (
                                <button type="button" key={m} onClick={() => setPaymentMethod(m)} className={`px-3 py-1.5 text-sm rounded-md flex-1 capitalize ${paymentMethod === m ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-secondary/80'}`}>{m}</button>
                            ))}
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-semibold text-muted-foreground mb-1">Narration (Optional)</label>
                        <input type="text" value={narration} onChange={e => setNarration(e.target.value)} className="w-full p-3 border border-border rounded-lg bg-input" />
                    </div>
                </div>
                <div className="flex justify-end space-x-3 pt-6 mt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold">Cancel</button>
                    <button type="submit" className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md">Save Record</button>
                </div>
            </form>
        </div>
    );
};

const LedgerStatement: React.FC<{
    account: LedgerAccount;
    onBack: () => void;
}> = ({ account, onBack }) => {
    const { journal } = useContext(AppContext);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const transactions = useMemo(() => {
        let balance = 0;
        return journal
            .filter(entry => entry.transactions.some(t => t.accountId === account.id))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(entry => {
                const transaction = entry.transactions.find(t => t.accountId === account.id);
                if (!transaction) return null;

                const debit = transaction.type === 'debit' ? transaction.amount : 0;
                const credit = transaction.type === 'credit' ? transaction.amount : 0;
                balance += (debit - credit);

                return {
                    ...entry,
                    debit,
                    credit,
                    balance,
                };
            }).filter((t): t is NonNullable<typeof t> => t !== null);
    }, [journal, account.id]);
    
    const finalBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <div>
                    <button onClick={onBack} className="text-sm font-semibold text-primary hover:underline mb-2">&larr; Back to All Ledgers</button>
                    <h1 className="text-3xl font-bold text-foreground">{account.name} - Ledger</h1>
                </div>
                <div className="text-right">
                    <p className="text-muted-foreground">Closing Balance</p>
                    <p className={`text-2xl font-bold ${finalBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                        ₹{Math.abs(finalBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {finalBalance >= 0 ? 'Dr' : 'Cr'}
                    </p>
                </div>
            </div>
            {(account.type === 'Customer' || account.type === 'Supplier') && (
                <div className="mb-4">
                    <button onClick={() => setIsPaymentModalOpen(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold shadow-md">
                        Record {account.type === 'Customer' ? 'Receipt' : 'Payment'}
                    </button>
                </div>
            )}
            <div className="bg-card rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm text-left text-foreground min-w-[800px]">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Date</th>
                            <th className="px-4 py-3 font-semibold">Particulars</th>
                            <th className="px-4 py-3 font-semibold">Ref. Type</th>
                            <th className="px-4 py-3 font-semibold text-right">Debit (₹)</th>
                            <th className="px-4 py-3 font-semibold text-right">Credit (₹)</th>
                            <th className="px-4 py-3 font-semibold text-right">Balance (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(t => (
                            <tr key={t.id} className="border-t border-border">
                                <td className="px-4 py-3">{new Date(t.date).toLocaleDateString('en-GB')}</td>
                                <td className="px-4 py-3">{t.narration}</td>
                                <td className="px-4 py-3">{t.referenceType}</td>
                                <td className="px-4 py-3 text-right">{t.debit > 0 ? t.debit.toFixed(2) : '-'}</td>
                                <td className="px-4 py-3 text-right">{t.credit > 0 ? t.credit.toFixed(2) : '-'}</td>
                                <td className="px-4 py-3 text-right font-semibold">
                                    {Math.abs(t.balance).toFixed(2)} {t.balance >= 0 ? 'Dr' : 'Cr'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {transactions.length === 0 && <p className="text-center py-12 text-muted-foreground">No transactions recorded for this account.</p>}
            </div>
            {/* FIX: Added a check to narrow account.type to satisfy the prop requirements of RecordPaymentModal. */}
            {isPaymentModalOpen && (account.type === 'Customer' || account.type === 'Supplier') && <RecordPaymentModal accountId={account.id} accountName={account.name} accountType={account.type} onClose={() => setIsPaymentModalOpen(false)} />}
        </div>
    );
};


const Ledgers: React.FC = () => {
    const { journal, customers, suppliers } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState<AccountType>('Customer');
    const [selectedAccount, setSelectedAccount] = useState<LedgerAccount | null>(null);

    const generalAccounts = useMemo((): Omit<LedgerAccount, 'balance' | 'balanceType'>[] => [
        { id: 'AC-CASH', name: 'Cash Account', type: 'General' },
        { id: 'AC-BANK', name: 'Bank Account', type: 'General' },
        { id: 'AC-SALES', name: 'Sales Account', type: 'General' },
        { id: 'AC-PURCHASES', name: 'Purchases Account', type: 'General' },
        { id: 'AC-SALES-RETURN', name: 'Sales Return Account', type: 'General' },
        { id: 'AC-PURCHASE-RETURN', name: 'Purchase Return Account', type: 'General' },
        { id: 'AC-VOUCHERS-PAYABLE', name: 'Vouchers Payable', type: 'General' },
        { id: 'AC-SGST-INPUT', name: 'SGST Input', type: 'General' },
        { id: 'AC-CGST-INPUT', name: 'CGST Input', type: 'General' },
        { id: 'AC-SGST-OUTPUT', name: 'SGST Output', type: 'General' },
        { id: 'AC-CGST-OUTPUT', name: 'CGST Output', type: 'General' },
    ], []);

    const allLedgers = useMemo(() => {
        const ledgers = new Map<string, LedgerAccount>();

        // Initialize all possible ledgers
        customers.forEach(c => ledgers.set(c.id, { id: c.id, name: c.name, type: 'Customer', balance: 0, balanceType: 'Dr' }));
        suppliers.forEach(s => ledgers.set(s.id, { id: s.id, name: s.name, type: 'Supplier', balance: 0, balanceType: 'Dr' }));
        generalAccounts.forEach(ga => ledgers.set(ga.id, { ...ga, balance: 0, balanceType: 'Dr' }));

        // Calculate balances
        journal.forEach(entry => {
            entry.transactions.forEach(t => {
                const ledger = ledgers.get(t.accountId);
                if (ledger) {
                    if (t.type === 'debit') ledger.balance += t.amount;
                    else ledger.balance -= t.amount;
                }
            });
        });

        // Finalize balance type
        ledgers.forEach(ledger => {
            ledger.balanceType = ledger.balance >= 0 ? 'Dr' : 'Cr';
            ledger.balance = Math.abs(ledger.balance);
        });

        return Array.from(ledgers.values());
    }, [journal, customers, suppliers, generalAccounts]);

    if (selectedAccount) {
        return <LedgerStatement account={selectedAccount} onBack={() => setSelectedAccount(null)} />;
    }

    const filteredLedgers = allLedgers.filter(l => l.type === activeTab);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-foreground mb-6">Account Ledgers</h1>
            <div className="flex border-b border-border mb-6">
                {(['Customer', 'Supplier', 'General'] as AccountType[]).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-semibold capitalize transition-colors ${activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                        {tab}s
                    </button>
                ))}
            </div>
            <div className="bg-card rounded-xl border border-border overflow-x-auto">
                 <table className="w-full text-sm text-left text-foreground">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Account Name</th>
                            <th className="px-6 py-3 font-semibold text-right">Closing Balance (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLedgers.map(ledger => (
                            <tr key={ledger.id} onClick={() => setSelectedAccount(ledger)} className="border-t border-border hover:bg-secondary/50 cursor-pointer">
                                <td className="px-6 py-4 font-semibold">{ledger.name}</td>
                                <td className="px-6 py-4 text-right">
                                    {ledger.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {ledger.balanceType}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
                 {filteredLedgers.length === 0 && <p className="text-center py-12 text-muted-foreground">No {activeTab} accounts found.</p>}
            </div>
        </div>
    );
};

export default Ledgers;