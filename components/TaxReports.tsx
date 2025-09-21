import React, { useState, useContext, useMemo, useRef } from 'react';
import { AppContext } from '../App';
import { Transaction, Purchase, Product } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ExportIcon, UploadCloudIcon, MonthlySalesIcon, MonthlyPurchasesIcon, TaxIcon, CashIcon, CreditIcon } from './Icons';

type Tab = 'dashboard' | 'sales' | 'purchases' | 'analysis';

// Helper to download CSV
function downloadCSV(data: any[], filename: string) {
    if (data.length === 0) {
        alert('No data available to export.');
        return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                let val = String(row[header] ?? '');
                if (val.includes(',')) return `"${val.replace(/"/g, '""')}"`;
                return val;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

const getTransactionDetails = (transaction: Transaction) => {
    const subTotal = transaction.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmount = subTotal * (transaction.discountPercentage || 0) / 100;
    const taxableValue = subTotal - discountAmount;
    const gstAmount = transaction.total - taxableValue;
    return { taxableValue, gstAmount, cgst: gstAmount / 2, sgst: gstAmount / 2 };
};

const getPurchaseDetails = (purchase: Purchase) => {
    const taxableValue = purchase.items.reduce((sum, item) => sum + item.amount, 0);
    const gstAmount = purchase.total - taxableValue;
    return { taxableValue, gstAmount, cgst: gstAmount / 2, sgst: gstAmount / 2 };
};

const TaxStatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; iconBgColor: string; }> = ({ title, value, icon, iconBgColor }) => (
    <div className="bg-card border border-border p-5 rounded-xl flex items-start space-x-4">
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
    </div>
);

// Custom Tooltip for Pie Chart
const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-popover/90 text-popover-foreground backdrop-blur-sm p-3 border border-border rounded-lg shadow-lg">
          <p className="label text-sm font-bold">{data.name}</p>
          <p className="text-sm" style={{ color: data.payload.fill }}>
            Sales Value: ₹{data.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
};

// Custom Tooltip for Bar Chart
const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-popover/90 text-popover-foreground backdrop-blur-sm p-3 border border-border rounded-lg shadow-lg space-y-1">
                <p className="label text-sm font-bold">{payload[0].payload.name}</p>
                {payload.map((pld: any) => (
                    <div key={pld.dataKey} style={{ color: pld.fill }} className="text-sm flex justify-between items-center gap-4">
                        <span>{pld.name}:</span>
                        <span className="font-bold">₹{pld.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};


// Custom Label for Pie Chart Slices
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null; // Don't render label for small slices for clarity
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="font-bold text-xs pointer-events-none">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};


const TaxReports: React.FC = () => {
    const { transactions, purchases, products, customers, suppliers, gstSettings } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [dateRange, setDateRange] = useState(() => {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 29);
        return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
    });
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { filteredTransactions, filteredPurchases } = useMemo(() => {
        if (!dateRange.from || !dateRange.to) {
            return { filteredTransactions: [], filteredPurchases: [] };
        }
        const fromTime = new Date(dateRange.from).getTime();
        const toTime = new Date(dateRange.to).getTime() + 86400000;

        const filteredTransactions = transactions.filter(t => {
            const tDate = new Date(t.date).getTime();
            return tDate >= fromTime && tDate <= toTime;
        });

        const filteredPurchases = purchases.filter(p => {
            const pDate = new Date(p.date).getTime();
            return pDate >= fromTime && pDate <= toTime;
        });

        return { filteredTransactions, filteredPurchases };
    }, [transactions, purchases, dateRange]);

    const dashboardData = useMemo(() => {
        let totalSales = 0, gstCollected = 0, cogs = 0;
        filteredTransactions.forEach(t => {
            const { taxableValue, gstAmount } = getTransactionDetails(t);
            totalSales += taxableValue;
            gstCollected += gstAmount;
            t.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                const batch = product?.batches.find(b => b.id === item.batchId);
                cogs += (batch?.price || 0) * item.quantity;
            });
        });

        let totalPurchases = 0, gstPaid = 0;
        filteredPurchases.forEach(p => {
            const { taxableValue, gstAmount } = getPurchaseDetails(p);
            totalPurchases += taxableValue;
            gstPaid += gstAmount;
        });
        
        const grossProfit = totalSales - cogs;
        const profitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

        return {
            totalSales, gstCollected, cogs,
            totalPurchases, gstPaid,
            grossProfit, profitMargin,
            netGstLiability: gstCollected - gstPaid
        };
    }, [filteredTransactions, filteredPurchases, products]);
    
    const salesTableData = useMemo(() => {
        return filteredTransactions.map(t => {
            const { taxableValue, cgst, sgst } = getTransactionDetails(t);
            const customer = customers.find(c => c.id === t.customerId);
            const taxRate = t.items.length > 0 ? t.items[0].tax : 0; // Simplified
            return {
                invoiceNo: `SALE-${t.id.slice(-6).toUpperCase()}`,
                date: new Date(t.date).toLocaleDateString('en-GB'),
                customerName: t.customerName,
                customerGstin: customer?.gstin || 'N/A',
                taxableValue,
                gstRate: taxRate,
                cgst,
                sgst,
                total: t.total,
            };
        });
    }, [filteredTransactions, customers]);

    const purchasesTableData = useMemo(() => {
        return filteredPurchases.map(p => {
            const { taxableValue, cgst, sgst } = getPurchaseDetails(p);
            const supplier = suppliers.find(s => s.id === p.supplierId);
            const product = products.find(prod => prod.id === p.items[0]?.productId);
            const taxRate = product ? (product.hsnCode.startsWith('3004') ? gstSettings.general : gstSettings.subsidized) : 0; // Simplified
            return {
                invoiceNo: p.invoiceNumber || `PUR-${p.id.slice(-6).toUpperCase()}`,
                date: new Date(p.date).toLocaleDateString('en-GB'),
                supplierName: supplier?.name,
                supplierGstin: supplier?.gstin || 'N/A',
                taxableValue,
                gstRate: taxRate,
                cgst,
                sgst,
                total: p.total,
            };
        });
    }, [filteredPurchases, suppliers, products, gstSettings]);

    const analysisData = useMemo(() => {
        const hsnSales = new Map<string, any>();
        filteredTransactions.forEach(t => {
            t.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (!product) return;
                const { taxableValue, cgst, sgst } = getTransactionDetails(t); // Pro-rate this?
                const itemTaxable = taxableValue / t.items.length; // Simplified pro-rating

                const hsn = hsnSales.get(product.hsnCode) || { hsnCode: product.hsnCode, description: product.name, totalQuantity: 0, taxableValue: 0, totalCgst: 0, totalSgst: 0, totalTax: 0 };
                hsn.totalQuantity += item.quantity;
                hsn.taxableValue += itemTaxable;
                hsn.totalCgst += cgst / t.items.length;
                hsn.totalSgst += sgst / t.items.length;
                hsn.totalTax += (cgst + sgst) / t.items.length;
                hsnSales.set(product.hsnCode, hsn);
            });
        });
        
        const hsnPurchases = new Map<string, any>();
        filteredPurchases.forEach(p => {
            p.items.forEach(item => {
                const product = products.find(pr => pr.id === item.productId);
                if (!product) return;
                const { taxableValue, cgst, sgst } = getPurchaseDetails(p);
                const itemTaxable = taxableValue / p.items.length; // Simplified pro-rating

                const hsn = hsnPurchases.get(product.hsnCode) || { hsnCode: product.hsnCode, description: product.name, totalQuantity: 0, taxableValue: 0, totalCgst: 0, totalSgst: 0, totalTax: 0 };
                hsn.totalQuantity += item.quantity;
                hsn.taxableValue += itemTaxable;
                hsn.totalCgst += cgst / p.items.length;
                hsn.totalSgst += sgst / p.items.length;
                hsn.totalTax += (cgst + sgst) / p.items.length;
                hsnPurchases.set(product.hsnCode, hsn);
            });
        });

        const gstRateBreakdown = salesTableData.reduce((acc, sale) => {
            const rate = `${sale.gstRate}%`;
            acc[rate] = (acc[rate] || 0) + sale.taxableValue;
            return acc;
        }, {} as Record<string, number>);

        const pieData = Object.entries(gstRateBreakdown).map(([name, value]) => ({ name, value }));

        const monthlyTaxDataMap = new Map<string, { collected: number; paid: number }>();
        filteredTransactions.forEach(t => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const { gstAmount } = getTransactionDetails(t);
            const current = monthlyTaxDataMap.get(monthKey) || { collected: 0, paid: 0 };
            current.collected += gstAmount;
            monthlyTaxDataMap.set(monthKey, current);
        });
        filteredPurchases.forEach(p => {
            const date = new Date(p.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const { gstAmount } = getPurchaseDetails(p);
            const current = monthlyTaxDataMap.get(monthKey) || { collected: 0, paid: 0 };
            current.paid += gstAmount;
            monthlyTaxDataMap.set(monthKey, current);
        });
        const sortedKeys = Array.from(monthlyTaxDataMap.keys()).sort();
        const monthlyTaxChartData = sortedKeys.map(key => {
            const [year, month] = key.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            const monthName = date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
            const data = monthlyTaxDataMap.get(key)!;
            return {
                name: monthName,
                collected: parseFloat(data.collected.toFixed(2)),
                paid: parseFloat(data.paid.toFixed(2)),
            };
        });
        
        return {
            hsnSales: Array.from(hsnSales.values()),
            hsnPurchases: Array.from(hsnPurchases.values()),
            gstRateBreakdown: pieData,
            monthlyTaxChartData,
        };

    }, [filteredTransactions, filteredPurchases, products, salesTableData]);

    const PIE_COLORS = ['rgb(var(--chart-1))', 'rgb(var(--chart-2))', 'rgb(var(--chart-3))', 'rgb(var(--chart-4))', 'rgb(var(--chart-5))'];

    const handleExport = (type: 'sales' | 'purchases') => {
        const data = type === 'sales' ? salesTableData : purchasesTableData;
        downloadCSV(data, `${type}_report_${dateRange.from}_to_${dateRange.to}.csv`);
        setIsExportMenuOpen(false);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard': return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <TaxStatCard 
                            title="Total Sales" 
                            value={`₹${dashboardData.totalSales.toLocaleString('en-IN', {minimumFractionDigits: 2})}`} 
                            icon={<MonthlySalesIcon className="w-8 h-8 text-green-500" />}
                            iconBgColor="bg-green-100"
                        />
                        <TaxStatCard 
                            title="Total Purchases" 
                            value={`₹${dashboardData.totalPurchases.toLocaleString('en-IN', {minimumFractionDigits: 2})}`} 
                            icon={<MonthlyPurchasesIcon className="w-8 h-8 text-blue-500" />}
                            iconBgColor="bg-blue-100"
                        />
                        <TaxStatCard 
                            title="GST Collected" 
                            value={`₹${dashboardData.gstCollected.toLocaleString('en-IN', {minimumFractionDigits: 2})}`} 
                            icon={<CashIcon className="w-8 h-8 text-indigo-500" />}
                            iconBgColor="bg-indigo-100"
                        />
                        <TaxStatCard 
                            title="GST Paid (ITC)" 
                            value={`₹${dashboardData.gstPaid.toLocaleString('en-IN', {minimumFractionDigits: 2})}`} 
                            icon={<CreditIcon className="w-8 h-8 text-amber-500" />}
                            iconBgColor="bg-amber-100"
                        />
                        <TaxStatCard 
                            title="Net GST Liability" 
                            value={`₹${dashboardData.netGstLiability.toLocaleString('en-IN', {minimumFractionDigits: 2})}`} 
                            icon={<TaxIcon className="w-8 h-8 text-red-500" />}
                            iconBgColor="bg-red-100"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-card border border-border p-4 rounded-lg">
                            <h3 className="font-bold mb-3 text-lg">Financial Summary</h3>
                            <table className="w-full text-sm"><tbody>
                                <tr className="border-b border-border/50"><td className="py-2">Revenue from Operations (Sales)</td><td className="py-2 text-right font-semibold">₹{dashboardData.totalSales.toFixed(2)}</td></tr>
                                <tr className="border-b border-border/50"><td className="py-2">Less: Cost of Goods Sold (COGS)</td><td className="py-2 text-right font-semibold">₹{dashboardData.cogs.toFixed(2)}</td></tr>
                                <tr className="border-b border-border/50 font-bold"><td className="py-2">Gross Profit / Loss</td><td className="py-2 text-right">₹{dashboardData.grossProfit.toFixed(2)}</td></tr>
                                <tr><td className="py-2">Profit Margin</td><td className="py-2 text-right font-semibold">{dashboardData.profitMargin.toFixed(2)}%</td></tr>
                            </tbody></table>
                        </div>
                        <div className="bg-card border border-border p-4 rounded-lg">
                            <h3 className="font-bold mb-3 text-lg">GST Liability Summary</h3>
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground"><tr><th className="py-1 text-left">Description</th><th className="py-1 text-right">CGST (₹)</th><th className="py-1 text-right">SGST (₹)</th><th className="py-1 text-right">Total (₹)</th></tr></thead>
                                <tbody>
                                <tr className="border-b border-border/50"><td className="py-2">Output Tax (on Sales)</td><td className="py-2 text-right">{(dashboardData.gstCollected/2).toFixed(2)}</td><td className="py-2 text-right">{(dashboardData.gstCollected/2).toFixed(2)}</td><td className="py-2 text-right font-semibold">{dashboardData.gstCollected.toFixed(2)}</td></tr>
                                <tr className="border-b border-border/50"><td className="py-2">Less: Input Tax Credit (on Purchases)</td><td className="py-2 text-right">{(dashboardData.gstPaid/2).toFixed(2)}</td><td className="py-2 text-right">{(dashboardData.gstPaid/2).toFixed(2)}</td><td className="py-2 text-right font-semibold">{dashboardData.gstPaid.toFixed(2)}</td></tr>
                                <tr className="font-bold"><td className="py-2">Net GST Payable / (ITC to Carry)</td><td className="py-2 text-right">{(dashboardData.netGstLiability/2).toFixed(2)}</td><td className="py-2 text-right">{(dashboardData.netGstLiability/2).toFixed(2)}</td><td className="py-2 text-right">{dashboardData.netGstLiability.toFixed(2)}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
            case 'sales': return (
                <div className="bg-card rounded-xl border border-border overflow-x-auto">
                    <table className="w-full text-sm text-left text-foreground">
                        <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border"><tr>
                            <th className="px-4 py-3 font-semibold">Invoice No.</th><th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Customer</th>
                            <th className="px-4 py-3 font-semibold">GSTIN</th><th className="px-4 py-3 font-semibold text-right">Taxable Value</th>
                            <th className="px-4 py-3 font-semibold text-right">CGST</th><th className="px-4 py-3 font-semibold text-right">SGST</th><th className="px-4 py-3 font-semibold text-right">Total</th>
                        </tr></thead>
                        <tbody>{salesTableData.map(t => <tr key={t.invoiceNo} className="border-t border-border">
                            <td className="px-4 py-3 font-mono">{t.invoiceNo}</td><td className="px-4 py-3">{t.date}</td><td className="px-4 py-3">{t.customerName}</td>
                            <td className="px-4 py-3">{t.customerGstin}</td><td className="px-4 py-3 text-right">{t.taxableValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">{t.cgst.toFixed(2)}</td><td className="px-4 py-3 text-right">{t.sgst.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-bold">{t.total.toFixed(2)}</td>
                        </tr>)}</tbody>
                    </table>
                </div>
            );
            case 'purchases': return (
                 <div className="bg-card rounded-xl border border-border">
                    <div className="p-4 border-b border-border">
                        <button className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-secondary hover:bg-border/50 font-semibold text-sm">
                            <UploadCloudIcon className="w-5 h-5"/> Import GSTR-2B for Reconciliation
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-foreground">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border"><tr>
                                <th className="px-4 py-3 font-semibold">Invoice No.</th><th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Supplier</th>
                                <th className="px-4 py-3 font-semibold">GSTIN</th><th className="px-4 py-3 font-semibold text-right">Taxable Value</th>
                                <th className="px-4 py-3 font-semibold text-right">CGST</th><th className="px-4 py-3 font-semibold text-right">SGST</th><th className="px-4 py-3 font-semibold text-right">Total</th>
                            </tr></thead>
                            <tbody>{purchasesTableData.map(p => <tr key={p.invoiceNo} className="border-t border-border">
                                <td className="px-4 py-3 font-mono">{p.invoiceNo}</td><td className="px-4 py-3">{p.date}</td><td className="px-4 py-3">{p.supplierName}</td>
                                <td className="px-4 py-3">{p.supplierGstin}</td><td className="px-4 py-3 text-right">{p.taxableValue.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right">{p.cgst.toFixed(2)}</td><td className="px-4 py-3 text-right">{p.sgst.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right font-bold">{p.total.toFixed(2)}</td>
                            </tr>)}</tbody>
                        </table>
                    </div>
                 </div>
            );
            case 'analysis': return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-card border border-border p-4 rounded-lg">
                            <h3 className="font-bold mb-3 text-lg">HSN Summary of Outward Supplies (Sales)</h3>
                            <div className="max-h-80 overflow-y-auto">
                                <table className="w-full text-xs">
                                <thead className="text-muted-foreground bg-secondary sticky top-0"><tr>
                                    <th className="p-2 text-left">HSN</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Taxable</th><th className="p-2 text-right">Tax</th>
                                </tr></thead>
                                <tbody>{analysisData.hsnSales.map(h => <tr key={h.hsnCode} className="border-t border-border/50">
                                    <td className="p-2 font-semibold">{h.hsnCode}</td><td className="p-2 text-right">{h.totalQuantity}</td><td className="p-2 text-right">{h.taxableValue.toFixed(2)}</td><td className="p-2 text-right">{h.totalTax.toFixed(2)}</td>
                                </tr>)}</tbody></table>
                            </div>
                        </div>
                         <div className="bg-card border border-border p-4 rounded-lg">
                            <h3 className="font-bold mb-3 text-lg">HSN Summary of Inward Supplies (Purchases)</h3>
                            <div className="max-h-80 overflow-y-auto">
                                <table className="w-full text-xs">
                                <thead className="text-muted-foreground bg-secondary sticky top-0"><tr>
                                    <th className="p-2 text-left">HSN</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Taxable</th><th className="p-2 text-right">Tax</th>
                                </tr></thead>
                                <tbody>{analysisData.hsnPurchases.map(h => <tr key={h.hsnCode} className="border-t border-border/50">
                                    <td className="p-2 font-semibold">{h.hsnCode}</td><td className="p-2 text-right">{h.totalQuantity}</td><td className="p-2 text-right">{h.taxableValue.toFixed(2)}</td><td className="p-2 text-right">{h.totalTax.toFixed(2)}</td>
                                </tr>)}</tbody></table>
                            </div>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-card border border-border p-4 rounded-lg">
                             <h3 className="font-bold text-lg">GST Rate Breakdown (Sales)</h3>
                            <p className="text-sm text-muted-foreground mb-3">Shows the proportion of total sales value for each GST slab.</p>
                             <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie 
                                        data={analysisData.gstRateBreakdown} 
                                        dataKey="value" 
                                        nameKey="name" 
                                        cx="50%" 
                                        cy="50%" 
                                        outerRadius={110} 
                                        labelLine={false}
                                        label={renderCustomizedLabel}
                                    >
                                        {analysisData.gstRateBreakdown.map((entry, index) => ( <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} /> ))}
                                    </Pie>
                                    <Tooltip content={<CustomPieTooltip />} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-card border border-border p-4 rounded-lg">
                            <h3 className="font-bold text-lg">Input vs Output Tax</h3>
                            <p className="text-sm text-muted-foreground mb-3">A month-by-month comparison of GST collected (Output) vs. GST paid (Input).</p>
                             <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analysisData.monthlyTaxChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                                    <YAxis tickFormatter={(value) => `₹${(Number(value)/1000).toLocaleString()}k`} tickLine={false} axisLine={false} fontSize={12} />
                                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'transparent' }}/>
                                    <Legend />
                                    <Bar dataKey="collected" name="GST Collected (Output)" fill="rgb(var(--chart-2))" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="paid" name="GST Paid (Input)" fill="rgb(var(--chart-5))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <header className="flex flex-wrap gap-4 justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Tax Reports</h1>
                    <p className="text-muted-foreground mt-1">Your hub for GST and financial compliance.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                        <label htmlFor="from">From:</label>
                        <input type="date" name="from" id="from" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))} className="p-2 border border-border rounded-lg bg-input" />
                        <label htmlFor="to">To:</label>
                        <input type="date" name="to" id="to" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))} className="p-2 border border-border rounded-lg bg-input" />
                    </div>
                    <div className="relative" ref={exportMenuRef}>
                         <button onClick={() => setIsExportMenuOpen(o => !o)} className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold shadow-sm text-sm">
                            <ExportIcon className="mr-2 h-4 w-4" /> Export All
                        </button>
                        {isExportMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
                                <button className="w-full text-left px-3 py-2 text-sm hover:bg-secondary">Export Financial Summary (PDF)</button>
                                <button onClick={() => handleExport('sales')} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary">Export GSTR-1 Data (CSV)</button>
                                <button onClick={() => handleExport('purchases')} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary">Export GSTR-2 Data (CSV)</button>
                                <button className="w-full text-left px-3 py-2 text-sm hover:bg-secondary">Download GSTR-1 JSON</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {(['dashboard', 'sales', 'purchases', 'analysis'] as Tab[]).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`${ activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border' } whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm capitalize`}>
                            {tab === 'sales' ? 'Sales (GSTR-1)' : tab === 'purchases' ? 'Purchases (GSTR-2)' : tab === 'analysis' ? 'GST Analysis & HSN' : tab}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div>{renderTabContent()}</div>
        </div>
    );
};

export default TaxReports;