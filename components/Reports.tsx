import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { MonthlyPurchasesIcon, MonthlySalesIcon, SparklesIcon } from './Icons';

const SimpleTooltip = ({ active, payload, label, name, unit = '₹', isPercentage = false }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const formattedValue = isPercentage
      ? `${value.toFixed(2)}%`
      : `${unit}${value.toLocaleString('en-IN')}`;
    return (
      <div className="bg-popover/90 text-popover-foreground backdrop-blur-sm p-3 border border-border rounded-lg shadow-lg">
        <p className="label text-sm font-bold">{label}</p>
        <p className="text-sm" style={{ color: payload[0].color || payload[0].payload.fill }}>
          {`${name || payload[0].name}: ${formattedValue}`}
        </p>
      </div>
    );
  }
  return null;
};

const PieChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover/90 text-popover-foreground backdrop-blur-sm p-3 border border-border rounded-lg shadow-lg">
          <p className="label text-sm font-bold">{data.name}</p>
          <p className="text-sm" style={{ color: data.fill }}>
            Sales: ₹{data.value.toLocaleString('en-IN')}
          </p>
        </div>
      );
    }
    return null;
};


const AnalyticsCard: React.FC<{ title: string; value: string; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-card border border-border p-5 rounded-lg flex items-center space-x-4 text-left w-full">
        <div className="text-primary p-3 bg-primary/10 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
    </div>
);


const Analytics: React.FC = () => {
    const { products, transactions, purchases } = useContext(AppContext);
    
    const [dateRange, setDateRange] = useState(() => {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 29); // Default to last 30 days
        return { from, to };
    });
    
    // Helper to format date for input to avoid timezone issues
    const formatDateForInput = (date: Date) => {
        return date.toISOString().split('T')[0];
    };
    
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // When parsing date from input, it's treated as UTC midnight.
        // Adding 'T00:00:00' ensures it's parsed in the user's local timezone.
        const newDate = new Date(value + 'T00:00:00');
        setDateRange(prev => ({ ...prev, [name]: newDate }));
    };

    const filteredData = useMemo(() => {
        const fromTime = dateRange.from.getTime();
        const toTime = dateRange.to.getTime() + (24 * 60 * 60 * 1000 - 1); // Include the whole 'to' day
        
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

    const kpiData = useMemo(() => {
        const totalSales = filteredData.filteredTransactions.reduce((sum, t) => sum + t.total, 0);
        const totalPurchases = filteredData.filteredPurchases.reduce((sum, p) => sum + p.total, 0);

        const costOfGoodsSold = filteredData.filteredTransactions.reduce((cogsSum, t) => {
            return cogsSum + t.items.reduce((itemCogsSum, item) => {
                const product = products.find(p => p.id === item.productId);
                const batch = product?.batches.find(b => b.id === item.batchId);
                // batch.price is the purchase rate (cost)
                const itemCost = batch ? batch.price * item.quantity : 0;
                return itemCogsSum + itemCost;
            }, 0);
        }, 0);

        const grossProfit = totalSales - costOfGoodsSold;
        const profitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
        
        const totalInventoryValue = products.reduce((sum, p) => sum + p.batches.reduce((batchSum, b) => batchSum + (b.stock * b.price), 0), 0);
        const inventoryTurnover = totalInventoryValue > 0 ? totalPurchases / totalInventoryValue : 0;

        return { totalSales, totalPurchases, grossProfit, profitMargin, inventoryTurnover };
    }, [filteredData, products]);

    const timeSeriesData = useMemo(() => {
        const data = new Map<string, { sales: number; purchases: number; cogs: number }>();
        const start = new Date(dateRange.from);
        const end = new Date(dateRange.to);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const key = d.toISOString().split('T')[0];
            data.set(key, { sales: 0, purchases: 0, cogs: 0 });
        }
        
        filteredData.filteredTransactions.forEach(t => {
            const key = new Date(t.date).toISOString().split('T')[0];
            const entry = data.get(key);
            if(entry) {
                entry.sales += t.total;
                const transactionCogs = t.items.reduce((cogs, item) => {
                     const product = products.find(p => p.id === item.productId);
                     const batch = product?.batches.find(b => b.id === item.batchId);
                     return cogs + (batch ? batch.price * item.quantity : 0);
                }, 0);
                entry.cogs += transactionCogs;
            }
        });
        
        filteredData.filteredPurchases.forEach(p => {
            const key = new Date(p.date).toISOString().split('T')[0];
            const entry = data.get(key);
            if(entry) {
                entry.purchases += p.total;
            }
        });

        return Array.from(data.entries()).map(([date, values]) => {
            const profit = values.sales > 0 ? values.sales - values.cogs : -values.cogs;
            const margin = values.sales > 0 ? (profit / values.sales) * 100 : 0;
            return {
                name: new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
                sales: parseFloat(values.sales.toFixed(2)),
                purchases: parseFloat(values.purchases.toFixed(2)),
                profit: parseFloat(profit.toFixed(2)),
                margin: parseFloat(margin.toFixed(2)),
            };
        });
    }, [filteredData, dateRange, products]);

    const salesByCategoryData = useMemo(() => {
        const salesMap = new Map<string, number>();
        filteredData.filteredTransactions.forEach(t => {
            t.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const category = product.category || 'Uncategorized';
                    const currentSales = salesMap.get(category) || 0;
                    salesMap.set(category, currentSales + item.price * item.quantity);
                }
            });
        });
        return Array.from(salesMap.entries()).map(([name, value]) => ({ name, value }));
    }, [filteredData, products]);
    
    const profitByManufacturerData = useMemo(() => {
        const profitMap = new Map<string, { totalSales: number; totalCost: number }>();
        filteredData.filteredTransactions.forEach(t => {
            t.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const batch = product.batches.find(b => b.id === item.batchId);
                    if (batch) { // If the batch that was sold is not found, we cannot calculate profit.
                        const manufacturer = product.manufacturer;
                        const saleAmount = item.price * item.quantity;
                        const costAmount = batch.price * item.quantity; // batch.price is the purchase rate
                        const current = profitMap.get(manufacturer) || { totalSales: 0, totalCost: 0 };
                        profitMap.set(manufacturer, {
                            totalSales: current.totalSales + saleAmount,
                            totalCost: current.totalCost + costAmount,
                        });
                    }
                }
            });
        });

        return Array.from(profitMap.entries()).map(([name, data]) => {
            const profit = data.totalSales - data.totalCost;
            const margin = data.totalSales > 0 ? (profit / data.totalSales) * 100 : 0;
            return { name, profitMargin: parseFloat(margin.toFixed(2)) };
        });
    }, [filteredData, products]);


    const PIE_COLORS = ['rgb(var(--chart-1))', 'rgb(var(--chart-2))', 'rgb(var(--chart-3))', 'rgb(var(--chart-4))', 'rgb(var(--chart-5))'];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <header className="flex flex-wrap gap-4 justify-between items-center">
                <h1 className="text-3xl font-bold text-foreground">Analytics & Reports</h1>
                <div className="flex items-center gap-2 text-sm">
                    <label htmlFor="from">From:</label>
                    <input type="date" name="from" id="from" value={formatDateForInput(dateRange.from)} onChange={handleDateChange} className="p-2 border border-border rounded-lg bg-input" />
                    <label htmlFor="to">To:</label>
                    <input type="date" name="to" id="to" value={formatDateForInput(dateRange.to)} onChange={handleDateChange} className="p-2 border border-border rounded-lg bg-input" />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <AnalyticsCard title="Total Sales" value={`₹${kpiData.totalSales.toLocaleString('en-IN')}`} icon={<MonthlySalesIcon className="w-6 h-6" />} />
                <AnalyticsCard title="Total Purchases" value={`₹${kpiData.totalPurchases.toLocaleString('en-IN')}`} icon={<MonthlyPurchasesIcon className="w-6 h-6" />} />
                <AnalyticsCard title="Gross Profit / Loss" value={`₹${kpiData.grossProfit.toLocaleString('en-IN')}`} icon={<SparklesIcon className="w-6 h-6" />} />
                <AnalyticsCard title="Profit Margin" value={`${kpiData.profitMargin.toFixed(2)}%`} icon={<SparklesIcon className="w-6 h-6" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {['sales', 'purchases', 'profit', 'margin'].map(type => (
                    <div key={type} className="bg-card border border-border p-4 rounded-lg">
                        <h2 className="text-lg font-semibold text-foreground mb-4 px-2 capitalize">{type === 'margin' ? 'Profit Margin (%)' : `${type} Over Time`}</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            {type === 'margin' ? (
                                <LineChart data={timeSeriesData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                                    <Tooltip content={<SimpleTooltip name="Margin" isPercentage />} />
                                    <Line type="linear" dataKey={type} stroke="rgb(var(--chart-4))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                                    <ReferenceLine y={0} stroke="rgb(var(--border))" strokeDasharray="3 3" />
                                </LineChart>
                            ) : (
                                <AreaChart data={timeSeriesData}>
                                     <defs>
                                        <linearGradient id={`color-${type}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={type === 'sales' ? 'rgb(var(--chart-2))' : type === 'purchases' ? 'rgb(var(--chart-5))' : 'rgb(var(--chart-1))'} stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor={type === 'sales' ? 'rgb(var(--chart-2))' : type === 'purchases' ? 'rgb(var(--chart-5))' : 'rgb(var(--chart-1))'} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${Number(v)/1000}k`} />
                                    <Tooltip content={<SimpleTooltip name={type.charAt(0).toUpperCase() + type.slice(1)} />} />
                                    <Area type="linear" dataKey={type} stroke={type === 'sales' ? 'rgb(var(--chart-2))' : type === 'purchases' ? 'rgb(var(--chart-5))' : 'rgb(var(--chart-1))'} fill={`url(#color-${type})`} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                                    {type === 'profit' && <ReferenceLine y={0} stroke="rgb(var(--border))" strokeDasharray="3 3" />}
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                 ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 bg-card border border-border p-4 rounded-lg">
                    <h2 className="text-lg font-semibold text-foreground mb-4 px-2">Sales by Product Category</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            {/* FIX: Cast label props to `any` to bypass incorrect type inference missing the `percent` property. */}
                            <Pie data={salesByCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {salesByCategoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<PieChartTooltip />} />
                            <Legend iconType="circle" iconSize={8} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                 <div className="lg:col-span-3 bg-card border border-border p-4 rounded-lg">
                    <h2 className="text-lg font-semibold text-foreground mb-4 px-2">Profit Margin by Manufacturer</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={profitByManufacturerData} layout="vertical" margin={{ left: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                            <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} width={100} />
                            <Tooltip content={<SimpleTooltip name="Profit Margin" isPercentage />} cursor={{ fill: 'rgba(var(--border), 0.5)' }} />
                            <Bar dataKey="profitMargin" name="Profit Margin" fill="rgb(var(--chart-3))" barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
