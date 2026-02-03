import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../App';
import { Transaction, Purchase, TransactionFilterType, Product, MedicineSchedule, Supplier } from '../types';
import { ExportIcon, FilterIcon, CalendarIcon, XIcon } from './Icons';
import { getFile } from '../services/db';
import { getTransactions, getTransactionStats, getFilteredTransactions } from '../services/transactionService';

type CombinedTransaction = (Transaction | Purchase) & { type: 'Sale' | 'Purchase' };

const scheduleTypes: MedicineSchedule[] = ['H', 'H1', 'narcotic', 'tb'];
const scheduleColors: { [key in MedicineSchedule]: string } = {
    none: 'bg-gray-100 text-gray-700',
    H: 'bg-red-100 text-red-700',
    H1: 'bg-red-200 text-red-800 font-bold',
    narcotic: 'bg-purple-200 text-purple-800 font-bold',
    tb: 'bg-orange-200 text-orange-800 font-bold',
};

const paymentMethods: string[] = ['Cash', 'Card', 'UPI', 'Bank', 'Credit'];

// Helper to download CSV
function downloadCSV(data: any[], filename: string) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                let val = row[header];
                if (typeof val === 'string' && val.includes(',')) {
                    return `"${val}"`;
                }
                return val;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

const SummaryCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-secondary p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
);

const ExportReportsModal: React.FC<{ 
    onClose: () => void;
    transactions: Transaction[];
    purchases: Purchase[];
    products: Product[];
    suppliers: Supplier[];
}> = ({ onClose, transactions, purchases, products, suppliers }) => {
    const [reportType, setReportType] = useState<'sales' | 'purchases'>('sales');
    const [schedulesToExport, setSchedulesToExport] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState({ from: '', to: '' });

    const handleScheduleToggle = (schedule: string) => {
        setSchedulesToExport(prev => 
            prev.includes(schedule) ? prev.filter(s => s !== schedule) : [...prev, schedule]
        );
    };

    const handleExport = () => {
        if (schedulesToExport.length === 0) {
            alert('Please select at least one schedule medicine to export.');
            return;
        }

        const reportData: any[] = [];
        const sourceData = reportType === 'sales' ? transactions : purchases;

        const filteredByDate = (!dateRange.from || !dateRange.to) ? sourceData : sourceData.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= new Date(dateRange.from) && recordDate <= new Date(dateRange.to);
        });

        for (const record of filteredByDate) {
            for (const item of record.items) {
                const product = products.find(p => p.id === item.productId);
                if (product && product.schedule && schedulesToExport.includes(product.schedule)) {
                    const batch = product.batches.find(b => b.id === item.batchId);
                    const row = {
                        'Invoice ID': reportType === 'sales'
                            ? `SALE-${record.id.slice(-6).toUpperCase()}`
                            : (record as Purchase).invoiceNumber || `PUR-${record.id.slice(-6).toUpperCase()}`,
                        'Date': new Date(record.date).toLocaleDateString('en-GB'),
                        'Party Name': reportType === 'sales' ? (record as Transaction).customerName : suppliers.find(s => s.id === (record as Purchase).supplierId)?.name || 'N/A',
                        'Doctor Name': reportType === 'sales' ? (record as Transaction).doctorName || 'N/A' : 'N/A',
                        'Product Name': product.name,
                        'Schedule': product.schedule.toUpperCase(),
                        'Batch': batch?.batchNumber || 'N/A',
                        'Quantity': item.quantity,
                        'Manufacturer': product.manufacturer,
                    };
                    reportData.push(row);
                }
            }
        }

        if (reportData.length === 0) {
            alert('No data found for the selected criteria.');
            return;
        }
        
        const filename = `scheduled_${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
        downloadCSV(reportData, filename);
        onClose();
    };


    return (
         <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-card text-card-foreground rounded-xl p-6 w-full max-w-2xl m-4 border border-border shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Export Schedule Drug Report</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-muted-foreground mb-1">Report Type</label>
                        <div className="flex gap-2 rounded-lg bg-input p-1.5 border border-border w-full">
                            {(['sales', 'purchases'] as const).map(t => (
                                <button key={t} onClick={() => setReportType(t)} className={`px-3 py-1.5 text-sm rounded-md flex-1 capitalize ${reportType === t ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-secondary/80'}`}>{t}</button>
                            ))}
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-semibold text-muted-foreground mb-1">Schedule</label>
                         <div className="flex flex-wrap gap-2 rounded-lg bg-input p-1.5 border border-border">
                            {scheduleTypes.map(s => (
                                <button key={s} onClick={() => handleScheduleToggle(s)} className={`px-3 py-1.5 text-sm rounded-md flex-1 capitalize ${schedulesToExport.includes(s) ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-secondary/80'}`}>{s.toUpperCase()}</button>
                            ))}
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-semibold text-muted-foreground mb-1">Date Range (Optional)</label>
                        <div className="flex gap-2">
                             <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({...p, from: e.target.value}))} className="w-full p-2 border border-border rounded-lg bg-input"/>
                             <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({...p, to: e.target.value}))} className="w-full p-2 border border-border rounded-lg bg-input"/>
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end space-x-3 pt-6 mt-4 border-t border-border">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold">Cancel</button>
                    <button type="button" onClick={handleExport} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md">Export Report</button>
                </div>
            </div>
        </div>
    );
};


const TransactionHistory: React.FC = () => {
    const { transactions, setTransactions, purchases, transactionFilter, setTransactionFilter, suppliers, products } = useContext(AppContext);
    
    const [localFilter, setLocalFilter] = useState<TransactionFilterType>(transactionFilter.type);
    const [showFilters, setShowFilters] = useState(false);
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [scheduleFilters, setScheduleFilters] = useState<string[]>([]);
    const [paymentMethodFilters, setPaymentMethodFilters] = useState<string[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [partySearch, setPartySearch] = useState('');
    const [expandedRows, setExpandedRows] = useState<string[]>([]);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [transactionStats, setTransactionStats] = useState({ totalTransactions: 0, totalSales: 0, totalPurchases: 0 });

    // Fetch transactions and stats from backend
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [backendTransactions, stats] = await Promise.all([
                    getTransactions(),
                    getTransactionStats()
                ]);
                
                console.log('Fetched transactions from backend:', backendTransactions);
                
                // Convert backend transactions to frontend format
                const formattedTransactions = backendTransactions.map((t: any) => ({
                    id: t._id || t.id,
                    type: t.type || 'sale', // Default to 'sale' if type is missing
                    customerId: t.customerId,
                    customerName: t.customerName,
                    supplierName: t.supplierName,
                    doctorName: t.doctorName,
                    doctorRegNo: t.doctorRegNo,
                    isRghs: t.isRghs,
                    items: t.items,
                    total: t.total,
                    date: t.createdAt || t.date,
                    discountPercentage: t.discountPercentage,
                    status: t.status,
                    paymentMethod: t.paymentMethod,
                    attachedPrescriptions: t.attachedPrescriptions
                }));
                
                // Replace context transactions with backend data only
                setTransactions(formattedTransactions);
                setTransactionStats(stats);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Fetch filtered transactions when any filter changes
    useEffect(() => {
        if (!showFilters) return;
        
        const fetchFilteredData = async () => {
            setLoading(true);
            try {
                const filters = {
                    type: localFilter !== 'all' ? localFilter.slice(0, -1) : '',
                    startDate: dateRange.from,
                    endDate: dateRange.to,
                    productSearch: productSearch.length >= 3 ? productSearch : '',
                    partySearch: partySearch.length >= 3 ? partySearch : '',
                    paymentMethods: paymentMethodFilters.length > 0 ? paymentMethodFilters : '',
                    schedules: scheduleFilters.length > 0 ? scheduleFilters : ''
                };
                
                const filtered = await getFilteredTransactions(filters);
                const formattedTransactions = filtered.map((t: any) => ({
                    id: t._id || t.id,
                    type: t.type || 'sale',
                    customerId: t.customerId,
                    customerName: t.customerName,
                    supplierName: t.supplierName,
                    doctorName: t.doctorName,
                    items: t.items,
                    total: t.total,
                    date: t.createdAt || t.date,
                    status: t.status,
                    paymentMethod: t.paymentMethod
                }));
                
                setTransactions(formattedTransactions);
            } catch (error) {
                console.error('Failed to fetch filtered transactions:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchFilteredData();
    }, [localFilter, dateRange, scheduleFilters, paymentMethodFilters, productSearch, partySearch, showFilters]);

    useEffect(() => {
        setLocalFilter(transactionFilter.type);
        if (transactionFilter.period === 'last_month') {
            const to = new Date();
            const from = new Date();
            from.setMonth(to.getMonth() - 1);
            setDateRange({ from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] });
        }
        return () => {
            if(transactionFilter.period === 'last_month') {
                setTransactionFilter({ ...transactionFilter, period: 'all' });
            }
        };
    }, []);

    const handleFilterChange = async (newFilter: TransactionFilterType) => {
        setLocalFilter(newFilter);
        setTransactionFilter({ type: newFilter, period: 'all' });
        
        // Fetch filtered data from backend
        setLoading(true);
        try {
            const filters = {
                type: newFilter !== 'all' ? newFilter.slice(0, -1) : '', // 'sales' -> 'sale'
            };
            
            const filtered = await getFilteredTransactions(filters);
            const formattedTransactions = filtered.map((t: any) => ({
                id: t._id || t.id,
                customerId: t.customerId,
                customerName: t.customerName,
                doctorName: t.doctorName,
                items: t.items,
                total: t.total,
                date: t.createdAt || t.date,
                status: t.status,
                paymentMethod: t.paymentMethod
            }));
            
            setTransactions(formattedTransactions);
        } catch (error) {
            console.error('Failed to fetch filtered transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleFilterToggle = (schedule: string) => {
        setScheduleFilters(prev => 
            prev.includes(schedule) ? prev.filter(s => s !== schedule) : [...prev, schedule]
        );
    };

    const handlePaymentMethodFilterToggle = (method: string) => {
        setPaymentMethodFilters(prev => 
            prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
        );
    };

    const allTransactions = useMemo(() => {
        console.log('Raw transactions:', transactions);
        // Use the type from backend data and capitalize it for display
        const formattedTransactions: CombinedTransaction[] = transactions.map(t => {
            console.log('Transaction type:', t.type);
            return {
                ...t, 
                type: (t.type === 'sale' || !t.type) ? 'Sale' as const : 'Purchase' as const
            };
        });
        return formattedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        // When filters are active, use backend-filtered data directly
        if (showFilters && (localFilter !== 'all' || dateRange.from || dateRange.to || scheduleFilters.length > 0 || paymentMethodFilters.length > 0 || productSearch.length >= 3 || partySearch.length >= 3)) {
            return allTransactions;
        }
        
        // Only apply frontend filtering when no backend filters are active
        let results: CombinedTransaction[] = allTransactions;

        if (localFilter === 'sales') results = results.filter(t => t.type === 'Sale');
        else if (localFilter === 'purchases') results = results.filter(t => t.type === 'Purchase');

        return results;
    }, [allTransactions, localFilter, dateRange, scheduleFilters, paymentMethodFilters, productSearch, partySearch, products, suppliers, showFilters]);

    const summaryData = useMemo(() => {
        let totalSales = 0, totalPurchases = 0;
        filteredTransactions.forEach(t => t.type === 'Sale' ? totalSales += t.total : totalPurchases += t.total);
        return { totalSales, totalPurchases, transactionCount: filteredTransactions.length };
    }, [filteredTransactions]);

    const toggleRow = (id: string) => setExpandedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);

    const handleExportCurrentView = () => {
                const dataToExport = filteredTransactions.map(t => {
            let payment = 'N/A';
            if (t.type === 'Sale') {
                const sale = t as Transaction;
                payment = sale.status === 'credit' ? 'Credit' : sale.paymentMethod || 'N/A';
            } else {
                const purchase = t as Purchase;
                payment = purchase.status === 'credit' ? 'Credit' : (purchase.paymentMethod || 'N/A').toUpperCase();
            }
            
            return {
                'ID': t.type === 'Sale'
                    ? `SALE-${(t.id || '').slice(-6).toUpperCase()}`
                    : (t as Purchase).invoiceNumber || `PUR-${(t.id || '').slice(-6).toUpperCase()}`,
                'Type': t.type,
                'Date': new Date(t.date).toLocaleDateString('en-CA'),
                'Party': t.type === 'Sale' ? (t as Transaction).customerName : suppliers.find(s => s.id === (t as Purchase).supplierId)?.name || 'N/A',
                'Payment': payment,
                'Items': t.items.length,
                'Total': t.total.toFixed(2),
            }
        });
        downloadCSV(dataToExport, `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const viewFile = async (fileId: string) => {
        const file = await getFile(fileId);
        if (file) {
            const url = URL.createObjectURL(file);
            window.open(url, '_blank');
        } else {
            alert('File not found in local database.');
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Transaction History</h1>
                    {loading && <p className="text-sm text-muted-foreground">Loading transactions...</p>}
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={handleExportCurrentView} className="flex items-center px-3 py-2 border border-border rounded-lg bg-secondary hover:bg-border/50 font-semibold text-sm"><ExportIcon className="mr-2 h-4 w-4" /> Export View</button>
                    <button onClick={() => setIsExportModalOpen(true)} className="flex items-center px-3 py-2 border border-border rounded-lg bg-secondary hover:bg-border/50 font-semibold text-sm"><ExportIcon className="mr-2 h-4 w-4" /> Schedule Drug Reports</button>
                </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <SummaryCard title="Total Transactions" value={transactionStats.totalTransactions} />
                <SummaryCard title="Total Sales Value" value={`₹${transactionStats.totalSales.toLocaleString('en-IN')}`} />
                <SummaryCard title="Total Purchase Value" value={`₹${transactionStats.totalPurchases.toLocaleString('en-IN')}`} />
            </div>

            <div className="bg-card rounded-xl border border-border p-4 mb-6">
                 <div className="flex flex-wrap gap-4 justify-between items-center">
                    <div className="flex items-center space-x-2 bg-secondary p-1 rounded-lg border">
                        {(['all', 'sales', 'purchases'] as TransactionFilterType[]).map(val => 
                            <button key={val} onClick={() => handleFilterChange(val)} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors capitalize ${localFilter === val ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-background'}`}>{val}</button>
                        )}
                    </div>
                    <button onClick={() => setShowFilters(f => !f)} className="flex items-center px-3 py-2 border border-border rounded-lg bg-secondary hover:bg-border/50 font-semibold text-sm"><FilterIcon className="mr-2 h-4 w-4" /> {showFilters ? 'Hide' : 'Show'} Filters</button>
                </div>
                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 mt-4 border-t border-border">
                        <div className="space-y-4">
                           <div>
                                <label className="text-sm font-semibold text-muted-foreground mb-1 block">Date Range</label>
                                <div className="flex gap-1">
                                    <input type="date" value={dateRange.from} onChange={e=>setDateRange(p=>({...p, from:e.target.value}))} className="w-full mt-1 p-2 border border-border rounded-md bg-input"/>
                                    <input type="date" value={dateRange.to} onChange={e=>setDateRange(p=>({...p, to:e.target.value}))} className="w-full mt-1 p-2 border border-border rounded-md bg-input"/>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-muted-foreground mb-1 block">By Product</label>
                                <input type="text" placeholder="Product name (min 3 chars)..." value={productSearch} onChange={e=>setProductSearch(e.target.value)} className="w-full mt-1 p-2 border border-border rounded-md bg-input"/>
                            </div>
                             <div>
                                <label className="text-sm font-semibold text-muted-foreground mb-1 block">By Customer/Supplier</label>
                                <input type="text" placeholder="Party name (min 3 chars)..." value={partySearch} onChange={e=>setPartySearch(e.target.value)} className="w-full mt-1 p-2 border border-border rounded-md bg-input"/>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-muted-foreground mb-1 block">By Medicine Schedule</label>
                                <div className="flex flex-wrap gap-2 mt-1">{scheduleTypes.map(s => <button key={s} onClick={()=>handleScheduleFilterToggle(s)} className={`px-2 py-1 text-xs rounded ${scheduleFilters.includes(s) ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>{s.toUpperCase()}</button>)}</div>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-muted-foreground mb-1 block">By Payment Method</label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {paymentMethods.map(m => 
                                        <button 
                                            key={m} 
                                            onClick={() => handlePaymentMethodFilterToggle(m)} 
                                            className={`px-2 py-1 text-xs rounded ${paymentMethodFilters.includes(m) ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
                                        >
                                            {m}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-card rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm text-left text-foreground min-w-[900px]">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border">
                        <tr>
                            <th className="px-4 py-3 font-semibold">ID / Type</th>
                            <th className="px-4 py-3 font-semibold">Customer/Supplier</th>
                            <th className="px-4 py-3 font-semibold">Date</th>
                            <th className="px-4 py-3 font-semibold">Schedule</th>
                            <th className="px-4 py-3 font-semibold text-center">Items</th>
                            <th className="px-4 py-3 font-semibold text-right">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map(t => {
                            const isExpanded = expandedRows.includes(t.id);
                            const schedules = Array.from(new Set(t.items.map(item => products.find(p=>p.id===item.productId)?.schedule).filter(s => s && s !== 'none')));
                            return (
                                <React.Fragment key={t.id}>
                                    <tr onClick={() => toggleRow(t.id)} className="border-t border-border hover:bg-secondary/50 cursor-pointer">
                                        <td className="px-4 py-3">
                                            <p className="font-mono text-xs">
                                                {t.type === 'Sale'
                                                    ? `SALE-${(t.id || '').slice(-6).toUpperCase()}`
                                                    : (t as Purchase).invoiceNumber || `PUR-${(t.id || '').slice(-6).toUpperCase()}`}
                                            </p>
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${t.type === 'Sale' ? 'bg-success/10 text-success' : 'bg-blue-500/10 text-blue-500'}`}>{t.type.toUpperCase()}</span>
                                        </td>
                                        <td className="px-4 py-3 font-medium">{t.type === 'Sale' ? (t as Transaction).customerName : (suppliers.find(s => s.id === (t as Purchase).supplierId)?.name || 'N/A')}</td>
                                        <td className="px-4 py-3">{new Date(t.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</td>
                                        <td className="px-4 py-3 flex flex-wrap gap-1">{schedules.map(s => <span key={s} className={`px-2 py-0.5 text-xs rounded ${scheduleColors[s as MedicineSchedule]}`}>{s!.toUpperCase()}</span>)}</td>
                                        <td className="px-4 py-3 text-center">{t.items.length}</td>
                                        <td className="px-4 py-3 text-right font-bold text-base">₹{t.total.toLocaleString('en-IN')}</td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-secondary/40"><td colSpan={6} className="p-2"><div className="p-2 bg-background rounded-md border">
                                            <h4 className="font-bold text-xs mb-1 px-2">Items in transaction:</h4>
                                            <table className="w-full text-xs">
                                                <thead><tr><th className="p-2 text-left">Product</th><th className="p-2 text-left">Batch</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Amount</th></tr></thead>
                                                <tbody>{t.items.map(item => { const product=products.find(p=>p.id===item.productId); const batch=product?.batches.find(b=>b.id===item.batchId); return (<tr key={item.productId+item.batchId}><td className="p-2">{item.productName}</td><td className="p-2">{batch?.batchNumber}</td><td className="p-2 text-center">{item.quantity}</td><td className="p-2 text-right">₹{item.price.toFixed(2)}</td><td className="p-2 text-right font-semibold">₹{('amount' in item ? item.amount : item.price * item.quantity).toFixed(2)}</td></tr>)})}</tbody>
                                            </table>
                                            {t.type === 'Sale' && (t as Transaction).attachedPrescriptions && (
                                                <div className="mt-2 pt-2 border-t border-border/50">
                                                    <h5 className="font-bold text-xs mb-1 px-2">Attached Prescriptions:</h5>
                                                    <ul className="list-disc list-inside px-2">
                                                        {Object.entries((t as Transaction).attachedPrescriptions!).map(([productId, fileId]) => {
                                                            const productName = t.items.find(i => i.productId === productId)?.productName || 'Unknown Product';
                                                            return (
                                                                <li key={productId}>
                                                                    <button onClick={() => viewFile(fileId)} className="text-primary text-xs hover:underline">
                                                                        View prescription for {productName}
                                                                    </button>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            )}
                                            {t.type === 'Purchase' && (t as Purchase).sourceFileId && (
                                                <div className="mt-2 pt-2 border-t border-border/50 text-center">
                                                    <button onClick={() => viewFile((t as Purchase).sourceFileId!)} className="text-primary text-sm font-semibold hover:underline">
                                                        View Source Invoice File
                                                    </button>
                                                </div>
                                            )}
                                        </div></td></tr>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </tbody>
                </table>
                {filteredTransactions.length === 0 && !loading && <p className="text-center py-12 text-muted-foreground">No transactions found for the selected filters.</p>}
                {loading && <p className="text-center py-12 text-muted-foreground">Loading transactions...</p>}
            </div>
            {isExportModalOpen && <ExportReportsModal onClose={() => setIsExportModalOpen(false)} {...{transactions, purchases, products, suppliers}} />}
        </div>
    );
};

export default TransactionHistory;