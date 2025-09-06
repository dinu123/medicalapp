import React, { useContext, useMemo, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { MonthlySalesIcon, MonthlyPurchasesIcon, LowStockIcon, ExpiringSoonIcon, BellIcon, UserIcon, ProfileIcon, SettingsIcon, LogoutIcon } from './Icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Product } from '../types';
import GlobalSearch from './GlobalSearch';

const DashboardCard: React.FC<{ title: string; value: string; subtitle: string; icon: React.ReactNode; onClick: () => void; }> = ({ title, value, subtitle, icon, onClick }) => (
    <button onClick={onClick} className="bg-card border border-border p-5 rounded-lg flex items-center space-x-4 text-left w-full hover:shadow-lg hover:-translate-y-1 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
        <div className="text-primary">
            {icon}
        </div>
        <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
    </button>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const sales = payload.find((p: any) => p.dataKey === 'sales')?.value || 0;
    const purchases = payload.find((p: any) => p.dataKey === 'purchases')?.value || 0;
    const profitOrLoss = sales - purchases;

    return (
      <div className="bg-popover/90 text-popover-foreground backdrop-blur-sm p-4 border border-border rounded-lg shadow-xl min-w-[240px]">
        <p className="label text-base font-bold mb-2">{label}</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between items-center">
            <span className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: 'rgb(var(--chart-2))' }}></span>
              Total Sales:
            </span>
            <span className="font-semibold">₹{sales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center">
             <span className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: 'rgb(var(--chart-5))' }}></span>
              Total Purchases:
            </span>
            <span className="font-semibold">₹{purchases.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        <hr className="border-border/50 my-2" />
        <div className="flex justify-between items-center text-sm font-bold mt-2">
          {profitOrLoss >= 0 ? (
            <>
              <span className="text-success">Profit:</span>
              <span className="text-success">
                ₹{profitOrLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </>
          ) : (
            <>
              <span className="text-error">Loss:</span>
              <span className="text-error">
                ₹{profitOrLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC = () => {
    const { products, transactions, purchases, setActivePage, setInventoryFilter, setTransactionFilter } = useContext(AppContext);
    const [chartRange, setChartRange] = useState<'day' | 'week' | 'month'>('month');
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const dashboardData = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlySales = transactions
            .filter(t => { const date = new Date(t.date); return date.getMonth() === currentMonth && date.getFullYear() === currentYear; })
            .reduce((sum, t) => sum + t.total, 0);

        const monthlyPurchases = purchases
            .filter(p => { const date = new Date(p.date); return date.getMonth() === currentMonth && date.getFullYear() === currentYear; })
            .reduce((sum, p) => sum + p.total, 0);

        const productsWithTotalStock = products.map(p => ({
            ...p,
            totalStock: p.batches.reduce((sum, b) => sum + b.stock, 0)
        }));

        const lowStockItems = productsWithTotalStock.filter(p => p.totalStock > 0 && p.totalStock < 20);
        
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);
        const expiringSoonItems = products.flatMap(p => 
            p.batches
              .filter(b => {
                  const expiryDate = new Date(b.expiryDate);
                  return expiryDate > now && expiryDate <= thirtyDaysFromNow;
              })
              .map(b => ({ ...p, batch: b }))
        );

        return { monthlySales, monthlyPurchases, lowStockItems, expiringSoonItems };
    }, [products, transactions, purchases]);
    
    const { chartData, dateRangeLabel } = useMemo(() => {
        const data = new Map<string, { sales: number; purchases: number; date: Date }>();
        const endDate = new Date();
        let startDate: Date;
        let dateKeyFormatter: (date: Date) => string;
        let dateGrouper: (date: Date) => string;

        switch (chartRange) {
            case 'day':
                startDate = new Date();
                startDate.setDate(endDate.getDate() - 29);
                startDate.setHours(0, 0, 0, 0);
                dateKeyFormatter = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                dateGrouper = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split('T')[0];

                for (let i = 29; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    d.setHours(0, 0, 0, 0);
                    const key = dateGrouper(d);
                    data.set(key, { sales: 0, purchases: 0, date: d });
                }
                break;
            
            case 'week':
                const getStartOfWeek = (d: Date) => {
                    const date = new Date(d);
                    const day = date.getDay(); // Sunday - 0
                    const diff = date.getDate() - day;
                    date.setDate(diff);
                    date.setHours(0, 0, 0, 0);
                    return date;
                };
                startDate = new Date();
                startDate.setDate(endDate.getDate() - (12 * 7 - 1));
                startDate.setHours(0, 0, 0, 0);
                dateKeyFormatter = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                dateGrouper = (d) => getStartOfWeek(d).toISOString().split('T')[0];
                
                for (let i = 11; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i * 7);
                    const weekStart = getStartOfWeek(d);
                    const key = dateGrouper(weekStart);
                    data.set(key, { sales: 0, purchases: 0, date: weekStart });
                }
                break;

            case 'month':
            default:
                startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1);
                startDate.setHours(0, 0, 0, 0);
                dateKeyFormatter = (d) => d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
                dateGrouper = (d) => new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];

                for (let i = 11; i >= 0; i--) {
                    const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
                    const key = dateGrouper(d);
                    data.set(key, { sales: 0, purchases: 0, date: d });
                }
                break;
        }

        transactions.forEach(t => {
            const date = new Date(t.date);
            if (date >= startDate && date <= endDate) {
                const key = dateGrouper(date);
                const entry = data.get(key);
                if (entry) {
                    entry.sales += t.total;
                }
            }
        });

        purchases.forEach(p => {
            const date = new Date(p.date);
            if (date >= startDate && date <= endDate) {
                const key = dateGrouper(date);
                const entry = data.get(key);
                if (entry) {
                    entry.purchases += p.total;
                }
            }
        });
        
        const chartData = Array.from(data.values()).map(value => ({
            name: dateKeyFormatter(value.date),
            sales: parseFloat(value.sales.toFixed(2)),
            purchases: parseFloat(value.purchases.toFixed(2)),
            profit: parseFloat((value.sales - value.purchases).toFixed(2)),
        }));
        
        const dateRangeLabel = `${startDate.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})} - ${endDate.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}`;

        return { chartData, dateRangeLabel };
    }, [transactions, purchases, chartRange]);
    
    const recentTransactions = [...transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    return (
        <div className="p-6 space-y-6 bg-secondary">
            <header className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground">Welcome to MediStore Pro</p>
                </div>
                <div className="flex-1 min-w-[300px]"> <GlobalSearch /> </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setActivePage('billing')} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow-sm hover:bg-primary/90 transition-colors font-semibold text-sm"> New Transaction </button>
                    <div ref={notificationsRef} className="relative">
                        <button onClick={() => setIsNotificationsOpen(o => !o)} className="p-2 rounded-full hover:bg-card relative">
                            <BellIcon className="w-6 h-6 text-muted-foreground" />
                            {(dashboardData.lowStockItems.length > 0 || dashboardData.expiringSoonItems.length > 0) &&
                                <span className="absolute top-1.5 right-1.5 block w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-secondary"></span>}
                        </button>
                        {isNotificationsOpen && (
                            <div className="absolute top-full right-0 mt-2 w-80 bg-popover border border-border rounded-lg shadow-xl z-50 p-2">
                               <div className="p-2 font-semibold text-sm">Notifications</div>
                               <div className="max-h-60 overflow-y-auto">
                                   {dashboardData.lowStockItems.length > 0 && <div className="p-2 text-xs border-b border-border"> <p className="font-bold text-yellow-600">Low Stock Alert</p> <p>{dashboardData.lowStockItems.length} items need restocking.</p></div>}
                                   {dashboardData.expiringSoonItems.length > 0 && <div className="p-2 text-xs"> <p className="font-bold text-red-600">Expiring Soon Alert</p> <p>{dashboardData.expiringSoonItems.length} items expiring in 30 days.</p></div>}
                                   {dashboardData.lowStockItems.length === 0 && dashboardData.expiringSoonItems.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">No new notifications.</p>}
                               </div>
                            </div>
                        )}
                    </div>
                    <div ref={userMenuRef} className="relative">
                        <button onClick={() => setIsUserMenuOpen(o => !o)} className="p-1.5 rounded-full hover:bg-card">
                            <UserIcon className="w-6 h-6 text-muted-foreground" />
                        </button>
                        {isUserMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-xl z-50 py-1">
                                <div className="px-3 py-2 border-b border-border">
                                    <p className="font-semibold text-sm">Pharmacist</p>
                                    <p className="text-xs text-muted-foreground">admin@medistore.pro</p>
                                </div>
                                <button className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2"><ProfileIcon className="w-4 h-4" /> My Profile</button>
                                <button className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Settings</button>
                                <button className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2 text-red-500"><LogoutIcon className="w-4 h-4" /> Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard title="Monthly Sales" value={`₹${dashboardData.monthlySales.toLocaleString('en-IN')}`} subtitle="Revenue this month" icon={<MonthlySalesIcon className="w-8 h-8 text-green-500" />} onClick={() => { setTransactionFilter({ type: 'sales', period: 'last_month' }); setActivePage('transaction-history'); }} />
                <DashboardCard title="Monthly Purchases" value={`₹${dashboardData.monthlyPurchases.toLocaleString('en-IN')}`} subtitle="Inventory investment" icon={<MonthlyPurchasesIcon className="w-8 h-8 text-blue-500" />} onClick={() => { setTransactionFilter({ type: 'purchases', period: 'last_month' }); setActivePage('transaction-history'); }} />
                <DashboardCard title={`${dashboardData.lowStockItems.length}`} value="Low Stock Items" subtitle="Need restocking" icon={<LowStockIcon className="w-8 h-8 text-yellow-500" />} onClick={() => { setInventoryFilter({ status: 'low_stock' }); setActivePage('inventory'); }} />
                <DashboardCard title={`${dashboardData.expiringSoonItems.length}`} value="Expiring Soon" subtitle="Within 30 days" icon={<ExpiringSoonIcon className="w-8 h-8 text-red-500" />} onClick={() => setActivePage('expiring')} />
            </div>

            <div className="bg-card border border-border p-4 rounded-lg">
                 <div className="flex flex-wrap justify-between items-center mb-4 px-2 gap-2">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Financial Overview</h2>
                        <p className="text-sm text-muted-foreground">{dateRangeLabel}</p>
                    </div>
                    <div className="flex items-center space-x-1 bg-secondary p-1 rounded-md text-sm">
                        <button onClick={() => setChartRange('day')} className={`px-3 py-1 rounded ${chartRange === 'day' ? 'bg-card shadow-sm text-primary font-semibold' : ''}`}>Day</button>
                        <button onClick={() => setChartRange('week')} className={`px-3 py-1 rounded ${chartRange === 'week' ? 'bg-card shadow-sm text-primary font-semibold' : ''}`}>Week</button>
                        <button onClick={() => setChartRange('month')} className={`px-3 py-1 rounded ${chartRange === 'month' ? 'bg-card shadow-sm text-primary font-semibold' : ''}`}>Month</button>
                    </div>
                </div>
                <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer>
                        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"> <stop offset="5%" stopColor="rgb(var(--chart-2))" stopOpacity={0.2}/> <stop offset="95%" stopColor="rgb(var(--chart-2))" stopOpacity={0}/> </linearGradient>
                                <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1"> <stop offset="5%" stopColor="rgb(var(--chart-5))" stopOpacity={0.2}/> <stop offset="95%" stopColor="rgb(var(--chart-5))" stopOpacity={0}/> </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                            <XAxis dataKey="name" stroke="rgb(var(--muted-foreground))" tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false}/>
                            <YAxis stroke="rgb(var(--muted-foreground))" tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${Number(value)/1000}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{paddingTop: '20px'}}/>
                            <Area dataKey="purchases" name="Total Purchases" stroke="rgb(var(--chart-5))" strokeWidth={2} fillOpacity={1} fill="url(#colorPurchases)" dot={{ r: 3 }} activeDot={{ r: 6 }} />
                            <Area dataKey="sales" name="Total Sales" stroke="rgb(var(--chart-2))" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" dot={{ r: 3 }} activeDot={{ r: 6 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-card border border-border p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
                        <button onClick={() => setActivePage('transaction-history')} className="text-sm font-semibold text-primary hover:underline">View All</button>
                    </div>
                    <div className="border-t border-border">
                        {recentTransactions.map((t, index) => (
                           <div key={t.id} className="flex justify-between items-center p-3 border-b border-border hover:bg-secondary">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-md flex items-center justify-center ${index % 2 === 0 ? 'bg-blue-100' : 'bg-indigo-100'}`}>
                                       <span className="font-bold text-sm text-blue-800">SELL</span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground text-sm">INV{t.id.slice(-5)}</p>
                                        <p className="text-xs text-muted-foreground">{t.items.length} item(s) • {new Date(t.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                     <p className="font-bold text-foreground text-sm">₹{t.total.toLocaleString('en-IN')}</p>
                                     <p className="text-xs text-muted-foreground">{index % 3 === 0 ? 'Card' : 'UPI'}</p>
                                </div>
                           </div>
                        ))}
                    </div>
                </div>
                <div className="lg:col-span-2 bg-card border border-border p-4 rounded-lg">
                    <h2 className="text-lg font-semibold text-foreground mb-4 px-2">Alerts & Notifications</h2>
                    <div className="space-y-3">
                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                            <h3 className="font-semibold text-sm text-yellow-800">Low Stock Alert</h3>
                            <p className="text-xs text-yellow-700 mb-2">{dashboardData.lowStockItems.length} medicines need restocking</p>
                            <ul className="space-y-1 text-xs text-yellow-700 list-disc list-inside">
                                {dashboardData.lowStockItems.slice(0,2).map(p => <li key={p.id}>{p.name} ({p.totalStock} left)</li>)}
                            </ul>
                            <button onClick={() => { setInventoryFilter({ status: 'low_stock' }); setActivePage('inventory'); }} className="text-xs font-bold text-yellow-800 hover:underline mt-2">View</button>
                        </div>
                         <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                            <h3 className="font-semibold text-sm text-red-800">Expiring Soon</h3>
                            <p className="text-xs text-red-700 mb-2">{dashboardData.expiringSoonItems.length} medicine batches expiring within 30 days</p>
                            <ul className="space-y-1 text-xs text-red-700 list-disc list-inside">
                                {dashboardData.expiringSoonItems.slice(0,2).map(p => <li key={p.id + p.batch.id}>{p.name} (expires {p.batch.expiryDate.split('-').reverse().join('-')})</li>)}
                            </ul>
                             <button onClick={() => setActivePage('expiring')} className="text-xs font-bold text-red-800 hover:underline mt-2">View</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;