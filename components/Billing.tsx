import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { AppContext } from '../App';
import { Product, CartItem, Transaction, Voucher, Batch } from '../types';
import { XIcon, SearchIcon, CashIcon, CardIcon, UpiIcon, PrintIcon, CreditIcon } from './Icons';

// Helper function to extract units per pack (e.g., tablets, capsules)
const getUnitsInPack = (pack: string): number => {
    // Improved regex for tabs and caps (plural-insensitive)
    const match = pack.match(/(\d+)\s*(tab|cap)s?/i);
    return match ? parseInt(match[1], 10) : 1;
};


type PaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Credit';

interface BillDetails {
    transaction: Transaction;
    customerName: string;
    contactNumber: string;
    cart: CartItem[];
    billSummary: any;
    paymentMethod: PaymentMethod;
    isRghs: boolean;
    status: 'paid' | 'credit';
}

const InvoiceModal: React.FC<{
    billDetails: BillDetails;
    products: Product[];
    onClose: () => void;
}> = ({ billDetails, products, onClose }) => {
    const { transaction, customerName, contactNumber, cart, billSummary, paymentMethod, isRghs, status } = billDetails;

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups for this website to print the invoice.');
            return;
        }

        const newDocument = printWindow.document;
        
        const tailwindCssUrl = "https://cdn.tailwindcss.com";
        const customStyles = `
            body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; color-adjust: exact; }
            .print-bg-secondary { background-color: #f3f4f6 !important; }
            .print-text-muted { color: #6b7280 !important; }
            .print-border-dashed { border-style: dashed !important; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
            th { background-color: #f3f4f6; }
        `;
        
        const invoiceHtml = `
            <html>
            <head>
                <title>Invoice - ${transaction.id.slice(-6)}</title>
                <script src="${tailwindCssUrl}"></script>
                <style>${customStyles}</style>
            </head>
            <body>
                <div class="p-8">
                    <div id="invoice-header" class="flex justify-between items-start mb-6">
                        <div>
                            <h1 class="text-3xl font-bold">MediStore Pharmacy</h1>
                            <p class="text-sm text-gray-500">123 Health St, Wellness City, 12345</p>
                            <p class="text-sm text-gray-500">Contact: (123) 456-7890 | GSTIN: 27ABCDE1234F1Z5</p>
                        </div>
                        <div class="text-right">
                            <h2 class="text-2xl font-semibold">Tax Invoice</h2>
                            <p class="text-sm"><b>INV No:</b> ${transaction.id.slice(-6)}</p>
                            <p class="text-sm"><b>Date:</b> ${new Date(transaction.date).toLocaleDateString('en-GB')}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-sm mb-6">
                        <div><p class="font-semibold">Billed To:</p><p>${customerName || 'N/A'}</p><p>${contactNumber || 'N/A'}</p></div>
                        ${(transaction.doctorName) ? `<div class="text-right"><p class="font-semibold">Prescribed by:</p><p>${transaction.doctorName}</p><p>${transaction.doctorRegNo || ''}</p></div>` : ''}
                    </div>
                    <table class="w-full text-sm text-left">
                        <thead class="text-xs text-gray-500 uppercase bg-gray-50 print-bg-secondary">
                            <tr>
                                <th class="px-4 py-2">S.No</th>
                                <th class="px-4 py-2">Item / HSN</th>
                                <th class="px-4 py-2">Batch</th>
                                <th class="px-4 py-2">Expiry</th>
                                <th class="px-4 py-2 text-center">Qty</th>
                                <th class="px-4 py-2 text-right">Rate</th>
                                <th class="px-4 py-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cart.map((item, index) => {
                                const product = products.find(p => p.id === item.productId);
                                const batch = product?.batches.find(b => b.id === item.batchId);
                                const unitsPerPack = product ? getUnitsInPack(product.pack) : 1;
                                const pricePerUnit = item.price / unitsPerPack;
                                const hasSaleDiscount = batch?.saleDiscount && batch.saleDiscount > 0;
                                const finalPricePerUnit = hasSaleDiscount ? pricePerUnit * (1 - batch.saleDiscount! / 100) : pricePerUnit;

                                return `<tr class="border-b">
                                    <td class="px-4 py-2">${index + 1}</td>
                                    <td class="px-4 py-2 font-semibold">${item.productName}<br><span class="text-xs text-gray-500 print-text-muted">HSN: ${product?.hsnCode || 'N/A'}</span></td>
                                    <td class="px-4 py-2">${batch?.batchNumber || ''}</td>
                                    <td class="px-4 py-2">${batch?.expiryDate.split('-').reverse().join('-') || ''}</td>
                                    <td class="px-4 py-2 text-center">${item.quantity}</td>
                                    <td class="px-4 py-2 text-right">₹${finalPricePerUnit.toFixed(2)}</td>
                                    <td class="px-4 py-2 text-right">₹${(finalPricePerUnit * item.quantity).toFixed(2)}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                     <div class="flex justify-end mt-4">
                        <div class="w-full max-w-sm space-y-2 text-sm">
                            <div class="flex justify-between"><span class="text-gray-500 print-text-muted">Sub Total:</span><span class="font-semibold">₹${billSummary.subTotal.toFixed(2)}</span></div>
                            <div class="flex justify-between"><span class="text-gray-500 print-text-muted">Discount:</span><span>- ₹${billSummary.discountAmount.toFixed(2)}</span></div>
                            ${billSummary.voucherDiscount > 0 ? `<div class="flex justify-between"><span class="text-gray-500 print-text-muted">Voucher:</span><span>- ₹${billSummary.voucherDiscount.toFixed(2)}</span></div>` : ''}
                             ${!isRghs ? Object.entries(billSummary.taxBreakdown).map(([rate, { sgst, cgst }]: [string, any]) => `
                                <div class="flex justify-between"><span class="text-gray-500 print-text-muted">SGST @ ${parseFloat(rate)/2}%:</span><span>+ ₹${sgst.toFixed(2)}</span></div>
                                <div class="flex justify-between"><span class="text-gray-500 print-text-muted">CGST @ ${parseFloat(rate)/2}%:</span><span>+ ₹${cgst.toFixed(2)}</span></div>
                            `).join('') : ''}
                            <hr class="border-gray-300" />
                            <div class="flex justify-between text-base font-bold"><span>Grand Total:</span><span>₹${billSummary.grandTotal.toFixed(2)}</span></div>
                        </div>
                    </div>
                    <footer class="text-center text-xs text-gray-500 print-text-muted mt-8 pt-4 border-t border-dashed print-border-dashed">
                        ${isRghs ? '<p class="font-bold mb-1">RGHS Portal Sale - GST Exempt</p>' : ''}
                        <p>Payment Status: <span class="font-semibold">${status === 'paid' ? `Paid via ${paymentMethod}` : 'Credit Due'}</span></p>
                        <p class="mt-4"><strong>Terms & Conditions:</strong> Medicines once sold will not be taken back. Please check expiry date before leaving the counter.</p>
                        <p>Thank you for your visit!</p>
                    </footer>
                </div>
            </body></html>
        `;

        newDocument.write(invoiceHtml);
        newDocument.close();
        
        // Use a timeout to ensure CSS loads before printing
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-card text-card-foreground rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-border overflow-y-auto" id="invoice-content-display">
                     <header className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-2xl font-bold">MediStore Pharmacy</h1>
                            <p className="text-sm text-muted-foreground">123 Health St, Wellness City</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-semibold">Invoice</h2>
                            <p className="text-sm"><b>INV No:</b> {transaction.id.slice(-6)}</p>
                            <p className="text-sm"><b>Date:</b> {new Date(transaction.date).toLocaleDateString('en-GB')}</p>
                        </div>
                    </header>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                        <div>
                            <p className="font-semibold">Billed To:</p>
                            <p>{customerName || 'N/A'}</p>
                            <p>{contactNumber || 'N/A'}</p>
                        </div>
                         {(transaction.doctorName) && (
                            <div className="text-right">
                                <p className="font-semibold">Prescribed by:</p>
                                <p>{transaction.doctorName}</p>
                                <p>{transaction.doctorRegNo}</p>
                            </div>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary">
                                <tr>
                                    <th className="px-4 py-2">S.No</th>
                                    <th className="px-4 py-2">Item</th>
                                    <th className="px-4 py-2">Batch</th>
                                    <th className="px-4 py-2">Expiry</th>
                                    <th className="px-4 py-2 text-center">Qty</th>
                                    <th className="px-4 py-2 text-right">Rate</th>
                                    <th className="px-4 py-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map((item, index) => {
                                    const product = products.find(p => p.id === item.productId);
                                    const batch = product?.batches.find(b => b.id === item.batchId);
                                    const unitsPerPack = product ? getUnitsInPack(product.pack) : 1;
                                    const pricePerUnit = item.price / unitsPerPack;
                                    const hasSaleDiscount = batch?.saleDiscount && batch.saleDiscount > 0;
                                    const finalPricePerUnit = hasSaleDiscount ? pricePerUnit * (1 - batch.saleDiscount! / 100) : pricePerUnit;

                                    return (
                                        <tr key={item.productId + item.batchId} className="border-b border-border">
                                            <td className="px-4 py-2">{index + 1}</td>
                                            <td className="px-4 py-2 font-semibold">{item.productName}</td>
                                            <td className="px-4 py-2">{batch?.batchNumber}</td>
                                            <td className="px-4 py-2">{batch?.expiryDate.split('-').reverse().join('-')}</td>
                                            <td className="px-4 py-2 text-center">{item.quantity}</td>
                                            <td className="px-4 py-2 text-right">₹{finalPricePerUnit.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right">₹{(finalPricePerUnit * item.quantity).toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                     <div className="flex justify-end mt-4">
                        <div className="w-full max-w-sm space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Sub Total:</span><span className="font-semibold">₹{billSummary.subTotal.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Discount:</span><span>- ₹{billSummary.discountAmount.toFixed(2)}</span></div>
                            {billSummary.voucherDiscount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Voucher:</span><span>- ₹{billSummary.voucherDiscount.toFixed(2)}</span></div>}
                             {!isRghs && Object.entries(billSummary.taxBreakdown).map(([rate, { sgst, cgst }]: [string, any]) => (
                                <React.Fragment key={rate}>
                                    <div className="flex justify-between"><span className="text-muted-foreground">SGST @ {parseFloat(rate)/2}%:</span><span>+ ₹{sgst.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">CGST @ {parseFloat(rate)/2}%:</span><span>+ ₹{cgst.toFixed(2)}</span></div>
                                </React.Fragment>
                            ))}
                            <hr className="border-border" />
                            <div className="flex justify-between text-base font-bold"><span >Grand Total:</span><span >₹{billSummary.grandTotal.toFixed(2)}</span></div>
                        </div>
                    </div>
                    <footer className="text-center text-xs text-muted-foreground mt-8 pt-4 border-t border-dashed">
                        { isRghs && <p className="font-bold mb-1">RGHS Portal Sale - GST Exempt</p> }
                        <p>Payment Status: <span className="font-semibold">{status === 'paid' ? `Paid via ${paymentMethod}` : 'Credit Due'}</span></p>
                        <p>Thank you for your visit!</p>
                    </footer>
                </div>
                <div className="p-4 bg-secondary flex justify-end space-x-3 no-print">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-card text-secondary-foreground hover:bg-border/50 font-semibold border border-border">New Sale</button>
                    <button onClick={handlePrint} className="flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md">
                        <PrintIcon className="mr-2"/> Print Invoice
                    </button>
                </div>
            </div>
        </div>
    );
};


const Sell: React.FC = () => {
    const { products, setProducts, setTransactions, cart, addToCart, updateCartQuantity, removeFromCart, clearCart, gstSettings, vouchers, setVouchers } = useContext(AppContext);
    
    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Bill State
    const [customerName, setCustomerName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [doctorName, setDoctorName] = useState('');
    const [doctorRegNo, setDoctorRegNo] = useState('');
    const [isRghs, setIsRghs] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
    const [showInvoice, setShowInvoice] = useState(false);
    const [lastBillDetails, setLastBillDetails] = useState<BillDetails | null>(null);

    // Voucher State
    const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
    const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);

    const productsWithStock = useMemo(() => 
        products.filter(p => p.batches.some(b => b.stock > 0)), 
        [products]
    );

    useEffect(() => {
        if (searchTerm.length > 1) {
            const lowerCaseTerm = searchTerm.toLowerCase();
            const results = productsWithStock.filter(p =>
                p.name.toLowerCase().includes(lowerCaseTerm) ||
                p.manufacturer.toLowerCase().includes(lowerCaseTerm) ||
                (p.salts && p.salts.toLowerCase().includes(lowerCaseTerm))
            ).slice(0, 7);
            setSearchResults(results);
            setShowResults(true);
            setFocusedIndex(-1);
        } else {
            setSearchResults([]);
            setShowResults(false);
        }
    }, [searchTerm, productsWithStock]);
    
    // Find available vouchers when customer name is typed
    useEffect(() => {
        if (customerName.trim()) {
            const activeCustomerVouchers = vouchers.filter(v => v.customerName?.toLowerCase() === customerName.toLowerCase().trim() && v.status === 'active');
            setAvailableVouchers(activeCustomerVouchers);
        } else {
            setAvailableVouchers([]);
        }
        setAppliedVoucher(null); // Reset applied voucher if customer name changes
    }, [customerName, vouchers]);
    
    // Keyboard navigation for search
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showResults && searchResults.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex(prev => (prev + 1) % searchResults.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
            } else if (e.key === 'Enter' && focusedIndex > -1) {
                e.preventDefault();
                handleSelectProduct(searchResults[focusedIndex]);
            } else if (e.key === 'Escape') {
                setShowResults(false);
            }
        }
    };
    
    // Close results on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectProduct = (product: Product) => {
        addToCart(product);
        setSearchTerm('');
        setShowResults(false);
    };
    
    const handleQuantityChange = (productId: string, batchId: string, pack: string, stripsStr: string, unitsStr: string) => {
        const unitsPerPack = getUnitsInPack(pack);
        const strips = parseInt(stripsStr, 10) || 0;
        const units = parseInt(unitsStr, 10) || 0;
        const totalQuantity = (strips * unitsPerPack) + units;
        
        const product = products.find(p => p.id === productId);
        const batch = product?.batches.find(b => b.id === batchId);

        if (batch && totalQuantity > batch.stock) {
            alert(`Quantity cannot exceed available stock for this batch (${batch.stock})`);
            return;
        }
        
        updateCartQuantity(productId, batchId, totalQuantity);
    };

    const billSummary = useMemo(() => {
        const subTotal = cart.reduce((total, item) => {
            const product = products.find(p => p.id === item.productId);
            const batch = product?.batches.find(b => b.id === item.batchId);
            if (!product || !batch) return total;
            
            const unitsPerPack = getUnitsInPack(product.pack);
            const pricePerUnit = item.price / unitsPerPack;
            
            const hasSaleDiscount = batch.saleDiscount && batch.saleDiscount > 0;
            const effectivePrice = hasSaleDiscount ? pricePerUnit * (1 - batch.saleDiscount! / 100) : pricePerUnit;

            return total + effectivePrice * item.quantity;
        }, 0);

        const discountAmount = subTotal * (discount / 100);
        let totalAfterDiscount = subTotal - discountAmount;

        const voucherDiscount = appliedVoucher ? Math.min(totalAfterDiscount, appliedVoucher.balance) : 0;
        totalAfterDiscount -= voucherDiscount;

        if (isRghs) {
            return { subTotal, discountAmount, voucherDiscount, totalSgst: 0, totalCgst: 0, grandTotal: totalAfterDiscount, taxBreakdown: {} };
        }

        const taxBreakdown: { [rate: number]: { sgst: number; cgst: number } } = {};
        let totalSgst = 0;
        let totalCgst = 0;

        cart.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            const batch = product?.batches.find(b => b.id === item.batchId);
            if (!product || !batch) return;

            const unitsPerPack = getUnitsInPack(product.pack);
            const pricePerUnit = item.price / unitsPerPack;
            const hasSaleDiscount = batch.saleDiscount && batch.saleDiscount > 0;
            const effectivePrice = hasSaleDiscount ? pricePerUnit * (1 - batch.saleDiscount! / 100) : pricePerUnit;
            const itemSubTotal = effectivePrice * item.quantity;
            
            // Distribute bill-wide discounts proportionally
            const itemProportionalValue = subTotal > 0 ? (itemSubTotal / subTotal) * (subTotal - discountAmount - voucherDiscount) : 0;
            
            const taxRate = item.tax;
            const gstAmount = itemProportionalValue * (taxRate / 100);
            const sgst = gstAmount / 2;
            const cgst = gstAmount / 2;
            
            if (!taxBreakdown[taxRate]) taxBreakdown[taxRate] = { sgst: 0, cgst: 0 };
            taxBreakdown[taxRate].sgst += sgst;
            taxBreakdown[taxRate].cgst += cgst;
            
            totalSgst += sgst;
            totalCgst += cgst;
        });

        const grandTotal = totalAfterDiscount + totalSgst + totalCgst;

        return { subTotal, discountAmount, voucherDiscount, totalSgst, totalCgst, grandTotal, taxBreakdown };
    }, [cart, discount, isRghs, gstSettings, products, appliedVoucher]);

    const handleCheckout = () => {
        const itemsToBill = cart.filter(item => item.quantity > 0);
        if (itemsToBill.length === 0) return alert("Cart is empty.");
        
        const newTransaction: Transaction = {
            id: `trans_${Date.now()}`,
            customerName: customerName || 'Walk-in Customer', doctorName, doctorRegNo, isRghs,
            items: itemsToBill.map(i => ({ ...i })),
            total: billSummary.grandTotal, date: new Date().toISOString(),
            discountPercentage: discount,
            status: paymentMethod === 'Credit' ? 'credit' : 'paid',
            paymentMethod: paymentMethod === 'Credit' ? undefined : paymentMethod,
        };

        setProducts(prev => {
            const newProds = JSON.parse(JSON.stringify(prev));
            itemsToBill.forEach(item => {
                const pIdx = newProds.findIndex((p: Product) => p.id === item.productId);
                if (pIdx > -1) {
                    const bIdx = newProds[pIdx].batches.findIndex((b: any) => b.id === item.batchId);
                    if (bIdx > -1) newProds[pIdx].batches[bIdx].stock -= item.quantity;
                }
            });
            return newProds;
        });

        if (appliedVoucher) {
            setVouchers(prev => prev.map(v => {
                if (v.id === appliedVoucher.id) {
                    const newBalance = v.balance - billSummary.voucherDiscount;
                    return { ...v, balance: newBalance, status: newBalance <= 0 ? 'used' : 'active' };
                }
                return v;
            }));
        }

        setTransactions(prev => [...prev, newTransaction]);
        setLastBillDetails({ transaction: newTransaction, customerName, contactNumber, cart: itemsToBill, billSummary, paymentMethod, isRghs, status: newTransaction.status });
        setShowInvoice(true);
    };

    const handleCloseInvoice = () => {
        setShowInvoice(false);
        setLastBillDetails(null);
        clearCart();
        setCustomerName(''); setContactNumber(''); setDoctorName(''); setDoctorRegNo(''); setIsRghs(false);
        setDiscount(0); setPaymentMethod('Cash');
        setAvailableVouchers([]); setAppliedVoucher(null);
    };
    
    const PaymentButton: React.FC<{ method: PaymentMethod, icon: React.ReactNode }> = ({ method, icon }) => (
        <button 
            onClick={() => setPaymentMethod(method)}
            className={`flex-1 p-3 rounded-lg flex flex-col items-center justify-center transition-all duration-200 border-2 ${paymentMethod === method ? 'bg-primary/10 border-primary text-primary font-bold' : 'bg-secondary border-transparent hover:border-border'}`}
        >
            {icon}
            <span className="text-xs mt-1">{method}</span>
        </button>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
            <div className="lg:col-span-2 flex flex-col h-full">
                <h1 className="text-3xl font-bold text-foreground mb-4">Sell</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input type="text" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-3 border border-border rounded-lg bg-input text-foreground" />
                    <input type="text" placeholder="Contact Number (Optional)" value={contactNumber} onChange={e => setContactNumber(e.target.value)} className="w-full p-3 border border-border rounded-lg bg-input" />
                    <input type="text" placeholder="Doctor Name (Optional)" value={doctorName} onChange={e => setDoctorName(e.target.value)} className="w-full p-3 border border-border rounded-lg bg-input" />
                    <input type="text" placeholder="Doctor Reg. No. (Optional)" value={doctorRegNo} onChange={e => setDoctorRegNo(e.target.value)} className="w-full p-3 border border-border rounded-lg bg-input" />
                </div>
                 <div className="flex items-center gap-2 mb-4">
                    <input type="checkbox" id="rghs-checkbox" checked={isRghs} onChange={e => setIsRghs(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                    <label htmlFor="rghs-checkbox" className="text-sm font-medium text-foreground">Items sold on RGHS portal (GST Exempt)</label>
                </div>
                 <div ref={searchRef} className="relative mb-4">
                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type="text" placeholder="Search for products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={handleKeyDown} className="w-full p-3 pl-10 border border-border rounded-lg bg-input" />
                    {showResults && (
                        <ul className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                            {searchResults.length > 0 ? searchResults.map((p, index) => (
                                <li key={p.id} onClick={() => handleSelectProduct(p)} onMouseEnter={() => setFocusedIndex(index)} className={`p-3 cursor-pointer ${focusedIndex === index ? 'bg-secondary' : 'hover:bg-secondary/50'}`}>
                                    <p className="font-semibold">{p.name}</p>
                                    <p className="text-sm text-muted-foreground">Stock: {p.batches.reduce((s, b) => s + b.stock, 0)} | MRP: ₹{p.batches.find(b=>b.stock > 0)?.mrp.toFixed(2)}</p>
                                </li>
                            )) : <li className="p-3 text-center text-muted-foreground">No products found.</li>}
                        </ul>
                    )}
                </div>

                <div className="bg-card rounded-lg border border-border flex-grow overflow-y-auto">
                     <table className="w-full text-sm">
                        <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0 border-b border-border"><tr><th className="px-4 py-3 text-left font-semibold">Product</th><th className="px-4 py-3 text-left font-semibold">Quantity</th><th className="px-4 py-3 text-right font-semibold">Rate</th><th className="px-4 py-3 text-right font-semibold">Amount</th><th className="px-4 py-3"></th></tr></thead>
                        <tbody>
                            {cart.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">Your cart is empty.</td></tr>}
                            {cart.map(item => {
                                const product = products.find(p => p.id === item.productId)!; 
                                const batch = product.batches.find(b => b.id === item.batchId)!;
                                const unitsPerPack = getUnitsInPack(product.pack); 
                                const isStripItem = unitsPerPack > 1;
                                const pricePerUnit = item.price / unitsPerPack;
                                const hasSaleDiscount = batch.saleDiscount && batch.saleDiscount > 0;
                                const effectivePrice = hasSaleDiscount ? pricePerUnit * (1 - batch.saleDiscount! / 100) : pricePerUnit;
                                const strips = isStripItem ? Math.floor(item.quantity / unitsPerPack) : 0;
                                const units = isStripItem ? item.quantity % unitsPerPack : item.quantity;
                                return (
                                <tr key={item.productId + item.batchId} className="border-t border-border">
                                    <td className="px-4 py-3">
                                        <p className="font-semibold">{item.productName}</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-xs text-muted-foreground">Batch: {batch.batchNumber}</p>
                                            {!isRghs && <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary">GST {item.tax}%</span>}
                                            {hasSaleDiscount && <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Discounted</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                             {isStripItem ? (<><input type="number" min="0" value={strips || ''} onChange={e => handleQuantityChange(item.productId, item.batchId, product.pack, e.target.value, String(units))} className="w-14 p-1.5 text-center border border-border rounded-md bg-input" placeholder="Strips"/><span>/</span><input type="number" min="0" value={units || ''} onChange={e => handleQuantityChange(item.productId, item.batchId, product.pack, String(strips), e.target.value)} className="w-14 p-1.5 text-center border border-border rounded-md bg-input" placeholder={product.pack.includes('cap')?'Caps':'Tabs'}/></>) : (<input type="number" min="0" value={units || ''} onChange={e => handleQuantityChange(item.productId, item.batchId, product.pack, '0', e.target.value)} className="w-14 p-1.5 text-center border border-border rounded-md bg-input" placeholder="Qty"/>)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {hasSaleDiscount ? (
                                            <div>
                                                <del className="text-xs text-muted-foreground">₹{pricePerUnit.toFixed(2)}</del>
                                                <p>₹{effectivePrice.toFixed(2)}</p>
                                            </div>
                                        ) : `₹${pricePerUnit.toFixed(2)}`}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold">₹{(effectivePrice * item.quantity).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-center"><button onClick={() => removeFromCart(item.productId, item.batchId)} className="text-destructive hover:text-destructive/80"><XIcon className="w-5 h-5"/></button></td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex flex-col bg-card rounded-xl border border-border p-6 h-full">
                <h2 className="text-2xl font-bold mb-4">Billing Summary</h2>
                <div className="flex-grow text-sm space-y-2">
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Sub Total</span><span className="font-semibold">₹{billSummary.subTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Discount</span>
                        <div className="flex items-center gap-1"><input type="number" min="0" step="0.01" value={discount || ''} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="w-16 p-1 text-right border border-border rounded-md bg-input"/><span>%</span></div>
                    </div>
                     <div className="flex justify-between items-center"><span className="text-muted-foreground"></span><span className="font-semibold text-destructive">- ₹{billSummary.discountAmount.toFixed(2)}</span></div>
                     
                    {availableVouchers.length > 0 && (
                        <div className="border-t border-border/50 pt-2 space-y-2">
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-semibold">Available Vouchers for {customerName}</p>
                                {appliedVoucher && <button onClick={() => setAppliedVoucher(null)} className="text-xs font-semibold text-destructive hover:underline">Clear</button>}
                            </div>
                            <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                                {availableVouchers.map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => setAppliedVoucher(v)}
                                        className={`w-full flex justify-between items-center p-2 rounded-md text-left border-2 transition-colors ${appliedVoucher?.id === v.id ? 'bg-primary/10 border-primary' : 'bg-secondary border-transparent hover:border-border'}`}
                                    >
                                        <span className="font-mono text-xs">{v.id.slice(-8)}</span>
                                        <span className="font-semibold text-sm">₹{v.balance.toFixed(2)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                     
                     {appliedVoucher && <div className="flex justify-between items-center"><span className="text-muted-foreground">Voucher Discount</span><span className="font-semibold text-destructive">- ₹{billSummary.voucherDiscount.toFixed(2)}</span></div>}
                    
                    {!isRghs && Object.entries(billSummary.taxBreakdown).map(([rate, { sgst, cgst }]: [string, any]) => (
                        <div key={rate} className='border-t border-border/50 pt-2'>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">SGST @ {parseFloat(rate)/2}%</span><span className="font-semibold">+ ₹{sgst.toFixed(2)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">CGST @ {parseFloat(rate)/2}%</span><span className="font-semibold">+ ₹{cgst.toFixed(2)}</span></div>
                        </div>
                    ))}
                </div>
                
                <div className="border-t border-border pt-4 mt-auto">
                    <div className="flex justify-between items-center text-2xl font-bold mb-4"><span>Grand Total:</span><span className="text-primary">₹{billSummary.grandTotal.toFixed(2)}</span></div>
                    <div className="mb-4">
                        <p className="text-sm font-semibold mb-2">Payment Method</p>
                        <div className="flex items-center gap-2"><PaymentButton method="Cash" icon={<CashIcon className="w-6 h-6"/>} /><PaymentButton method="Card" icon={<CardIcon className="w-6 h-6"/>} /><PaymentButton method="UPI" icon={<UpiIcon className="w-6 h-6"/>} /><PaymentButton method="Credit" icon={<CreditIcon className="w-6 h-6"/>} /></div>
                    </div>
                    <button onClick={handleCheckout} disabled={cart.filter(i => i.quantity > 0).length === 0} className="w-full py-3 bg-success text-white rounded-lg text-lg font-semibold hover:bg-success/90 disabled:bg-muted disabled:cursor-not-allowed">Complete Sale</button>
                </div>
            </div>
            {showInvoice && lastBillDetails && <InvoiceModal billDetails={lastBillDetails} products={products} onClose={handleCloseInvoice} />}
        </div>
    );
};

export default Sell;