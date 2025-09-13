import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../App';
import { Transaction, Purchase, Product, Supplier, ReturnItem, CustomerReturn, SupplierReturn, Voucher, CreditNote, LedgerEntry, PurchaseItem, TransactionItem, Batch } from '../types';
import { SearchIcon, XIcon, PrintIcon } from './Icons';

// Helper function to extract units per pack
const getUnitsInPack = (pack: string): number => {
    const match = pack.match(/(\d+)\s*(tab|cap)s?/i);
    return match ? parseInt(match[1], 10) : 1;
};

const InvoiceDetailModal: React.FC<{
    invoice: Transaction | Purchase;
    onClose: () => void;
}> = ({ invoice, onClose }) => {
    const { suppliers, products, gstSettings } = useContext(AppContext);
    const isSale = 'customerName' in invoice;
    const supplier = isSale ? null : suppliers.find(s => s.id === (invoice as Purchase).supplierId);

    const getTaxRate = (hsnCode: string = '') => hsnCode.startsWith('3004') ? gstSettings.general : hsnCode.startsWith('2106') ? gstSettings.food : gstSettings.subsidized;

    const lineItems = useMemo(() => {
        let totalMrp = 0;
        if (isSale) {
            totalMrp = invoice.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }
        const totalDiscountOnBill = isSale ? totalMrp * ((invoice as Transaction).discountPercentage || 0) / 100 : 0;
        
        return invoice.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            const batch = product?.batches.find(b => b.id === item.batchId);
            const taxRate = getTaxRate(product?.hsnCode);

            if (isSale) {
                const saleItem = item as TransactionItem;
                const itemMrp = saleItem.price * saleItem.quantity;
                const itemDiscount = totalMrp > 0 ? (itemMrp / totalMrp) * totalDiscountOnBill : 0;
                const taxableValue = itemMrp - itemDiscount;
                const gstAmount = taxableValue * (taxRate / 100);
                const sgst = gstAmount / 2;
                const cgst = gstAmount / 2;
                return {
                    ...item, product, batch, taxRate,
                    rate: saleItem.price,
                    discountPercentage: totalMrp > 0 ? (itemDiscount / itemMrp) * 100 : 0,
                    taxableValue, sgst, cgst,
                    total: taxableValue + gstAmount
                };
            } else {
                const purchaseItem = item as PurchaseItem;
                const taxableValue = purchaseItem.amount;
                const gstAmount = taxableValue * (taxRate / 100);
                const sgst = gstAmount / 2;
                const cgst = gstAmount / 2;
                return {
                    ...item, product, batch, taxRate,
                    rate: purchaseItem.price,
                    discountPercentage: batch?.discount || 0,
                    taxableValue, sgst, cgst,
                    total: taxableValue + gstAmount
                };
            }
        });
    }, [invoice, products, isSale, gstSettings]);

    const totals = useMemo(() => {
        return lineItems.reduce((acc, item) => {
            acc.taxableValue += item.taxableValue;
            acc.sgst += item.sgst;
            acc.cgst += item.cgst;
            acc.total += item.total;
            return acc;
        }, { taxableValue: 0, sgst: 0, cgst: 0, total: 0 });
    }, [lineItems]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-card text-card-foreground rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-border">
                    <header className="flex justify-between items-start mb-6">
                        <div><h1 className="text-2xl font-bold">{isSale ? 'Sale Invoice Details' : 'Purchase Invoice Details'}</h1></div>
                        <div className="text-right"><h2 className="text-xl font-semibold">Invoice</h2><p className="text-sm"><b>INV No:</b> {invoice.id.slice(-6)}</p><p className="text-sm"><b>Date:</b> {new Date(invoice.date).toLocaleDateString('en-GB')}</p></div>
                    </header>
                    <div className="text-sm mb-6"><p className="font-semibold">Billed {isSale ? 'To' : 'From'}:</p><p>{isSale ? (invoice as Transaction).customerName : supplier?.name}</p></div>
                    <div className="overflow-x-auto max-h-[50vh]">
                        <table className="w-full text-sm text-left"><thead className="text-xs text-muted-foreground uppercase bg-secondary sticky top-0"><tr>
                            <th className="px-3 py-2">Item</th><th className="px-3 py-2">HSN</th><th className="px-3 py-2">Batch</th><th className="px-3 py-2">Expiry</th>
                            <th className="px-3 py-2 text-center">Qty</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Disc%</th>
                            <th className="px-3 py-2 text-right">GST%</th><th className="px-3 py-2 text-right">Taxable</th>
                            <th className="px-3 py-2 text-right">SGST</th><th className="px-3 py-2 text-right">CGST</th><th className="px-3 py-2 text-right">Total</th>
                        </tr></thead>
                        <tbody>
                        {lineItems.map((lineItem) => (
                            <tr key={`${lineItem.productId}-${lineItem.batchId}`} className="border-b border-border">
                                <td className="px-3 py-2 font-semibold">{lineItem.productName}</td>
                                <td className="px-3 py-2">{lineItem.product?.hsnCode}</td>
                                <td className="px-3 py-2">{lineItem.batch?.batchNumber}</td>
                                <td className="px-3 py-2">{lineItem.batch?.expiryDate.split('-').reverse().join('-')}</td>
                                <td className="px-3 py-2 text-center">{lineItem.quantity}</td>
                                <td className="px-3 py-2 text-right">₹{lineItem.rate.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right">{lineItem.discountPercentage.toFixed(2)}%</td>
                                <td className="px-3 py-2 text-right">{lineItem.taxRate}%</td>
                                <td className="px-3 py-2 text-right">₹{lineItem.taxableValue.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right">₹{lineItem.sgst.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right">₹{lineItem.cgst.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right font-bold">₹{lineItem.total.toFixed(2)}</td>
                            </tr>
                        ))}
                        </tbody>
                        <tfoot className="text-xs">
                            <tr className="font-bold border-t-2 border-border">
                                <td colSpan={8} className="px-3 py-2 text-right uppercase">Calculated Totals:</td>
                                <td className="px-3 py-2 text-right">₹{totals.taxableValue.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right">₹{totals.sgst.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right">₹{totals.cgst.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right">₹{totals.total.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                        </table>
                    </div>
                    <div className="flex justify-end mt-4"><div className="w-full max-w-sm space-y-2 text-sm">
                        <hr className="border-border" />
                        <div className="flex justify-between text-base font-bold"><span>Grand Total (from Invoice):</span><span>₹{invoice.total.toFixed(2)}</span></div>
                        {Math.abs(invoice.total - totals.total) > 0.01 && 
                            <div className="text-destructive text-xs text-right font-semibold">Note: Calculated total (₹{totals.total.toFixed(2)}) differs slightly from stored invoice total.</div>
                        }
                    </div></div>
                </div>
                <div className="p-4 bg-secondary flex justify-end"><button onClick={onClose} className="px-4 py-2 rounded-lg bg-card text-secondary-foreground hover:bg-border/50 font-semibold border border-border">Close</button></div>
            </div>
        </div>
    );
};


const VoucherPrintModal: React.FC<{
    voucher: Voucher;
    onClose: () => void;
}> = ({ voucher, onClose }) => {
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print the voucher.');
            return;
        }

        const voucherHtml = `
            <html>
            <head>
                <title>Voucher - ${voucher.id}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>body { font-family: sans-serif; }</style>
            </head>
            <body>
                <div class="p-6">
                    <header class="text-center mb-6">
                        <h1 class="text-2xl font-bold">MediStore Pharmacy</h1>
                        <p class="text-sm text-gray-500">Store Credit Voucher</p>
                    </header>
                    <div class="space-y-3 text-center border-y border-dashed py-6">
                        <p><strong>Customer:</strong> ${voucher.customerName || 'Valued Customer'}</p>
                        <p><strong>Amount:</strong> <span class="text-2xl font-bold text-indigo-600">₹${voucher.initialAmount.toFixed(2)}</span></p>
                        <p><strong>Voucher ID:</strong> <span class="font-mono bg-gray-100 px-2 py-1 rounded">${voucher.id}</span></p>
                        <p><strong>Issued On:</strong> ${new Date(voucher.createdDate).toLocaleDateString('en-GB')}</p>
                    </div>
                    <footer class="text-center text-xs text-gray-500 mt-6">
                        <p>This voucher can be redeemed against any future purchase. It is non-transferable and cannot be exchanged for cash.</p>
                    </footer>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(voucherHtml);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-card text-card-foreground rounded-xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-border printable-area" id="voucher-content">
                    <header className="text-center mb-6"><h1 className="text-2xl font-bold">MediStore Pharmacy</h1><p className="text-sm text-muted-foreground">Store Credit Voucher</p></header>
                    <div className="space-y-3 text-center border-y border-dashed py-6">
                        <p><strong>Customer:</strong> {voucher.customerName || 'Valued Customer'}</p>
                        <p><strong>Amount:</strong> <span className="text-2xl font-bold text-primary">₹{voucher.initialAmount.toFixed(2)}</span></p>
                        <p><strong>Voucher ID:</strong> <span className="font-mono bg-secondary px-2 py-1 rounded">{voucher.id}</span></p>
                        <p><strong>Issued On:</strong> {new Date(voucher.createdDate).toLocaleDateString('en-GB')}</p>
                    </div>
                    <footer className="text-center text-xs text-muted-foreground mt-6"><p>This voucher can be redeemed against any future purchase. It is non-transferable and cannot be exchanged for cash.</p></footer>
                </div>
                <div className="p-4 bg-secondary flex justify-end space-x-3 no-print">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-card text-secondary-foreground hover:bg-border/50 font-semibold border border-border">Close</button>
                    <button onClick={handlePrint} className="flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md"><PrintIcon className="mr-2"/> Print Voucher</button>
                </div>
            </div>
        </div>
    );
};


const CreditNoteModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    creditNote: CreditNote;
    supplier: Supplier;
    returnItems: ReturnItem[];
    originalPurchase: Purchase;
}> = ({ isOpen, onClose, creditNote, supplier, returnItems, originalPurchase }) => {
    if (!isOpen) return null;

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print the credit note.');
            return;
        }

        const creditNoteHtml = `
            <html>
            <head>
                <title>Credit Note - ${creditNote.id.slice(-6)}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body { font-family: sans-serif; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
                    th { background-color: #f3f4f6; }
                </style>
            </head>
            <body>
                <div class="p-6">
                    <header class="flex justify-between items-start mb-6">
                        <div>
                            <h1 class="text-2xl font-bold">Credit Note</h1>
                            <p class="text-sm text-gray-500"><b>CN No:</b> ${creditNote.id.slice(-6)}</p>
                            <p class="text-sm text-gray-500"><b>Date:</b> ${new Date(creditNote.date).toLocaleDateString('en-GB')}</p>
                        </div>
                    </header>
                    <div class="grid grid-cols-2 gap-4 text-sm mb-6">
                        <div>
                            <p class="font-semibold">From (Supplier):</p>
                            <p>${supplier.name}</p>
                            <p>${supplier.address}</p>
                            <p>GSTIN: ${supplier.gstin}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-semibold">To (Billed To):</p>
                            <p>MediStore Pharmacy</p>
                            <p>123 Health St, Wellness City</p>
                            <p>GSTIN: 27ABCDE1234F1Z5</p>
                        </div>
                    </div>
                    <div class="bg-gray-50 p-2 rounded-lg text-sm mb-6">
                        <p class="font-semibold">Reference:</p>
                        <p>Original Invoice: ${originalPurchase.invoiceNumber || originalPurchase.id.slice(-6)}</p>
                        <p>Dated: ${new Date(originalPurchase.date).toLocaleDateString('en-GB')}</p>
                    </div>
                    <h3 class="font-semibold mb-2 text-sm">Items Returned:</h3>
                    <table class="w-full text-sm text-left">
                        <thead class="text-xs text-gray-500 uppercase bg-gray-50">
                            <tr><th class="px-4 py-2">Item</th><th class="px-4 py-2 text-center">Qty</th><th class="px-4 py-2 text-right">Rate</th><th class="px-4 py-2 text-right">Amount</th></tr>
                        </thead>
                        <tbody>
                            ${returnItems.map(item => `<tr class="border-b"><td class="px-4 py-2 font-semibold">${item.productName}</td><td class="px-4 py-2 text-center">${item.quantity}</td><td class="px-4 py-2 text-right">₹${item.price.toFixed(2)}</td><td class="px-4 py-2 text-right">₹${item.amount.toFixed(2)}</td></tr>`).join('')}
                        </tbody>
                    </table>
                    <div class="flex justify-end mt-4">
                        <div class="w-full max-w-sm space-y-2 text-sm">
                            <div class="flex justify-between text-base font-bold"><span>Total Credit Value:</span><span>₹${creditNote.amount.toFixed(2)}</span></div>
                        </div>
                    </div>
                    <div class="mt-20 flex justify-between text-sm">
                        <div class="w-1/2 border-t pt-2"><p class="text-gray-500">Pharmacist's Signature</p></div>
                        <div class="w-1/2 text-right border-t pt-2"><p class="text-gray-500">Supplier's Signature</p></div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(creditNoteHtml);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-card text-card-foreground rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-border printable-area" id="credit-note-content">
                    <header className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-2xl font-bold">Credit Note</h1>
                            <p className="text-sm text-muted-foreground"><b>CN No:</b> {creditNote.id.slice(-6)}</p>
                            <p className="text-sm text-muted-foreground"><b>Date:</b> {new Date(creditNote.date).toLocaleDateString('en-GB')}</p>
                        </div>
                    </header>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                        <div>
                            <p className="font-semibold">From (Supplier):</p>
                            <p>{supplier.name}</p>
                            <p>{supplier.address}</p>
                            <p>GSTIN: {supplier.gstin}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold">To (Billed To):</p>
                            <p>MediStore Pharmacy</p>
                            <p>123 Health St, Wellness City</p>
                            <p>GSTIN: 27ABCDE1234F1Z5</p>
                        </div>
                    </div>
                    <div className="bg-secondary p-2 rounded-lg text-sm mb-4">
                        <p className="font-semibold">Reference:</p>
                        <p>Original Invoice: {originalPurchase.invoiceNumber || originalPurchase.id.slice(-6)}</p>
                        <p>Dated: ${new Date(originalPurchase.date).toLocaleDateString('en-GB')}</p>
                    </div>
                    <h3 className="font-semibold mb-2 text-sm">Items Returned:</h3>
                    <table className="w-full text-sm text-left"><thead className="text-xs text-muted-foreground uppercase bg-secondary"><tr><th className="px-4 py-2">Item</th><th className="px-4 py-2 text-center">Qty</th><th className="px-4 py-2 text-right">Rate</th><th className="px-4 py-2 text-right">Amount</th></tr></thead><tbody>
                    {returnItems.map(item => (<tr key={item.productId + item.batchId} className="border-b border-border"><td className="px-4 py-2 font-semibold">{item.productName}</td><td className="px-4 py-2 text-center">{item.quantity}</td><td className="px-4 py-2 text-right">₹{item.price.toFixed(2)}</td><td className="px-4 py-2 text-right">₹{item.amount.toFixed(2)}</td></tr>))}</tbody></table>
                    <div className="flex justify-end mt-4"><div className="w-full max-w-sm space-y-2 text-sm"><div className="flex justify-between text-base font-bold"><span>Total Credit Value:</span><span>₹{creditNote.amount.toFixed(2)}</span></div></div></div>
                    <div className="mt-20 flex justify-between text-sm"><div className="w-1/2 border-t border-border pt-2"><p className="text-muted-foreground">Pharmacist's Signature</p></div><div className="w-1/2 text-right border-t border-border pt-2"><p className="text-muted-foreground">Supplier's Signature</p></div></div>
                </div>
                <div className="p-4 bg-secondary flex justify-end space-x-3 no-print">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-card text-secondary-foreground hover:bg-border/50 font-semibold border border-border">Close</button>
                    <button onClick={handlePrint} className="flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md"><PrintIcon className="mr-2"/> Print Credit Note</button>
                </div>
            </div>
        </div>
    );
};


const Returns: React.FC = () => {
    const { 
        products, setProducts, transactions, purchases, suppliers,
        setCustomerReturns, setSupplierReturns, setVouchers, setCreditNotes, setLedger,
        returnInitiationData, setReturnInitiationData
    } = useContext(AppContext);

    const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResult, setSearchResult] = useState<Transaction | Purchase | null>(null);
    const [returnCart, setReturnCart] = useState<Map<string, { item: any, returnQuantity: number }>>(new Map());
    const [settlementType, setSettlementType] = useState<'refund' | 'voucher'>('refund');
    const [finalizedReturn, setFinalizedReturn] = useState<{ creditNote: CreditNote, supplier: Supplier, returnItems: ReturnItem[], originalPurchase: Purchase } | null>(null);
    const [viewedInvoice, setViewedInvoice] = useState<Transaction | Purchase | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [printableVoucher, setPrintableVoucher] = useState<Voucher | null>(null);

    useEffect(() => {
        if (returnInitiationData) {
            setActiveTab('supplier');
            const purchase = purchases.find(p => p.items.some(item => item.batchId === returnInitiationData.batchId));
            if (purchase) {
                setSearchResult(purchase);
                const product = products.find(p => p.id === returnInitiationData.productId);
                const batch = product?.batches.find(b => b.id === returnInitiationData.batchId);
                const purchaseItem = purchase.items.find(item => item.batchId === returnInitiationData.batchId);
                
                if (batch && purchaseItem) {
                    const key = `${returnInitiationData.productId}-${returnInitiationData.batchId}`;
                    const newCart = new Map();
                    newCart.set(key, { item: purchaseItem, returnQuantity: batch.stock });
                    setReturnCart(newCart);
                }
            } else {
                setSuccessMessage("Could not find the original purchase invoice for the selected expiring item.");
            }
            setReturnInitiationData(null);
        }
    }, [returnInitiationData, purchases, products, setReturnInitiationData]);


    const handleSearch = () => {
        const term = searchTerm.toLowerCase();
        let found = null;
        if (activeTab === 'customer') {
            found = transactions.find(t => t.id.toLowerCase().includes(term) || t.customerName?.toLowerCase().includes(term) || t.id.slice(-6).toLowerCase() === term);
        } else {
            found = purchases.find(p => p.id.toLowerCase().includes(term) || p.invoiceNumber?.toLowerCase().includes(term) || p.id.slice(-6).toLowerCase() === term);
        }
        setSearchResult(found || null);
        setReturnCart(new Map()); // Clear cart on new search
        setSuccessMessage('');
    };

    const handleReturnQuantityChange = (key: string, item: any, value: string) => {
        const quantity = parseInt(value, 10) || 0;
        const maxQuantity = item.quantity;
        if (quantity < 0) return;
        const newReturnQuantity = Math.min(quantity, maxQuantity);
        setReturnCart(prev => {
            const newCart = new Map(prev);
            if (newReturnQuantity > 0) {
                newCart.set(key, { item, returnQuantity: newReturnQuantity });
            } else {
                newCart.delete(key);
            }
            return newCart;
        });
    };

    const returnSummary = useMemo(() => {
        let total = 0;
        returnCart.forEach(({ item, returnQuantity }) => {
             if (activeTab === 'customer') {
                const product = products.find(p => p.id === item.productId);
                if (!product) return;
                const unitsPerPack = getUnitsInPack(product.pack);
                const pricePerUnit = item.price / unitsPerPack;
                total += pricePerUnit * returnQuantity;
            } else {
                const purchaseItem = (searchResult as Purchase)?.items.find(pi => pi.batchId === item.batchId);
                if(purchaseItem) {
                    const pricePerUnit = purchaseItem.price;
                    total += pricePerUnit * returnQuantity;
                }
            }
        });
        return { total };
    }, [returnCart, activeTab, products, searchResult]);
    
    const resetForm = () => {
        setSearchTerm('');
        setSearchResult(null);
        setReturnCart(new Map());
        setSettlementType('refund');
        setSuccessMessage('');
    };

    const processCustomerReturn = () => {
        if (returnCart.size === 0 || !searchResult) return;
        const transaction = searchResult as Transaction;

        // --- Robust Data Integrity Checks ---
        for (const item of transaction.items) {
            const product = products.find(p => p.id === item.productId);
            if (!product) {
                setSuccessMessage(`Error: Product "${item.productName}" from the original invoice no longer exists. Return cannot be processed.`);
                return;
            }
            const batch = product.batches.find(b => b.id === item.batchId);
            if (!batch) {
                setSuccessMessage(`Error: A batch for "${item.productName}" from the original invoice is missing. Return cannot be processed.`);
                return;
            }
        }
        // --- End of Checks ---

        const returnId = `RTN-CUST-${Date.now()}`;
        const newReturnItems: ReturnItem[] = [];

        for (const { item, returnQuantity } of returnCart.values()) {
            const product = products.find(p => p.id === item.productId)!;
            const unitsPerPack = getUnitsInPack(product.pack);
            const pricePerUnit = item.price / unitsPerPack;
            newReturnItems.push({ 
                productId: item.productId, 
                productName: item.productName, 
                batchId: item.batchId, 
                quantity: returnQuantity, 
                price: pricePerUnit, 
                discount: 0, 
                amount: pricePerUnit * returnQuantity 
            });
        }
        
        const newReturn: CustomerReturn = { id: returnId, originalTransactionId: searchResult.id, items: newReturnItems, totalAmount: returnSummary.total, date: new Date().toISOString(), settlement: { type: settlementType }};
        
        setProducts(prev => {
            const updatedProducts = JSON.parse(JSON.stringify(prev));
            newReturnItems.forEach(item => {
                const product = updatedProducts.find((p: Product) => p.id === item.productId);
                if (product) { 
                    const batch = product.batches.find((b: any) => b.id === item.batchId); 
                    if (batch) batch.stock += item.quantity; 
                }
            });
            return updatedProducts;
        });

        if (settlementType === 'voucher') {
            const newVoucherId = `VCHR-CUST-${Date.now()}`;
            newReturn.settlement.voucherId = newVoucherId;
            const newVoucher: Voucher = { id: newVoucherId, customerName: (searchResult as Transaction).customerName, initialAmount: returnSummary.total, balance: returnSummary.total, createdDate: new Date().toISOString(), status: 'active' };
            setVouchers(prev => [...prev, newVoucher]);
            setPrintableVoucher(newVoucher);
        } else {
            const newLedgerEntry: LedgerEntry = { id: `LEDG-${Date.now()}`, date: new Date().toISOString(), type: 'debit', amount: returnSummary.total, description: `Refund for return ${returnId}`, relatedId: returnId };
            setLedger(prev => [...prev, newLedgerEntry]);
        }
        setCustomerReturns(prev => [...prev, newReturn]);
        setSuccessMessage('Customer return processed successfully!');
        setSearchResult(null); 
        setReturnCart(new Map());
    };
    
    const processSupplierReturn = () => {
        if (returnCart.size === 0 || !searchResult) return;
        const purchase = searchResult as Purchase;

        // --- Robust Data Integrity Checks at the start ---
        const supplier = suppliers.find(s => s.id === purchase.supplierId);
        if (!supplier) {
            setSuccessMessage(`Error: Supplier for this purchase could not be found. Return cancelled.`);
            return;
        }

        // Check ALL items from the original purchase, not just the ones being returned.
        for (const item of purchase.items) {
            const product = products.find(p => p.id === item.productId);
            if (!product) {
                setSuccessMessage(`Error: Product "${item.productName}" from the original invoice no longer exists. Return cannot be processed.`);
                return;
            }
            // Also check if the batch still exists within that product
            const batch = product.batches.find(b => b.id === item.batchId);
            if (!batch) {
                setSuccessMessage(`Error: A batch for "${item.productName}" from the original invoice is missing. Return cannot be processed.`);
                return;
            }
        }
        // --- End of Checks ---

        const returnId = `RTN-SUPP-${Date.now()}`;
        const newReturnItems: ReturnItem[] = [];

        for (const { item, returnQuantity } of returnCart.values()) {
            const purchaseItem = purchase.items.find(pi => pi.batchId === item.batchId);
            if (!purchaseItem) continue;
            newReturnItems.push({ 
                productId: item.productId, 
                productName: item.productName, 
                batchId: item.batchId, 
                quantity: returnQuantity, 
                price: purchaseItem.price, 
                discount: 0, 
                amount: purchaseItem.price * returnQuantity 
            });
        }
        
        if (newReturnItems.length === 0 && returnCart.size > 0) {
            setSuccessMessage('Error: Could not match return items to original invoice. Return cancelled.');
            return;
        }
        
        const newReturn: SupplierReturn = { 
            id: returnId, 
            originalPurchaseId: purchase.id, 
            supplierId: purchase.supplierId, 
            items: newReturnItems, 
            totalAmount: returnSummary.total, 
            date: new Date().toISOString(), 
            settlement: { type: purchase.status === 'paid' ? 'credit_note' : 'ledger_adjustment' }
        };
        
        setProducts(prev => {
            const updatedProducts = JSON.parse(JSON.stringify(prev));
            newReturnItems.forEach(item => {
                const product = updatedProducts.find((p: Product) => p.id === item.productId);
                if (product) { 
                    const batch = product.batches.find((b: any) => b.id === item.batchId); 
                    if (batch) batch.stock -= item.quantity; 
                }
            });
            return updatedProducts;
        });

        if (newReturn.settlement.type === 'credit_note') {
            const newCreditNoteId = `CN-SUPP-${Date.now()}`;
            newReturn.settlement.creditNoteId = newCreditNoteId;
            const newCreditNote: CreditNote = { 
                id: newCreditNoteId, 
                supplierId: purchase.supplierId, 
                supplierReturnId: returnId, 
                amount: returnSummary.total, 
                date: new Date().toISOString(), 
                status: 'open' 
            };
            setCreditNotes(prev => [...prev, newCreditNote]);
            setFinalizedReturn({ creditNote: newCreditNote, supplier, returnItems: newReturnItems, originalPurchase: purchase });
        }
        setSupplierReturns(prev => [...prev, newReturn]);
        setSuccessMessage('Supplier return processed successfully!');
        
        if (newReturn.settlement.type !== 'credit_note') {
             resetForm();
        } else {
             setSearchResult(null); 
             setReturnCart(new Map());
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-foreground mb-6">Returns Management</h1>
            <div className="flex border-b border-border mb-6">
                { (['customer', 'supplier'] as const).map(tab => (<button key={tab} onClick={() => { setActiveTab(tab); resetForm(); }} className={`px-4 py-2 text-sm font-semibold capitalize transition-colors ${activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{tab} Return</button>))}
            </div>
            {successMessage && <div className={`p-3 rounded-lg mb-4 text-center font-semibold ${successMessage.startsWith('Error') ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>{successMessage}</div>}


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex gap-2"><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder={`Search by ${activeTab} name or Invoice ID (last 6 digits)`} className="w-full p-3 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring" /><button onClick={handleSearch} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold"><SearchIcon className="w-5 h-5"/></button></div>
                    {searchResult && (
                        <div className="bg-card rounded-lg border border-border p-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-lg">Original Transaction Details</h3>
                                <button onClick={() => setViewedInvoice(searchResult)} className="text-sm font-semibold text-primary hover:underline">View Full Invoice</button>
                            </div>
                            <div className="text-sm space-y-1 mb-4"><p><strong>ID:</strong> {searchResult.id}</p><p><strong>Date:</strong> {new Date(searchResult.date).toLocaleDateString('en-GB')}</p><p><strong>{activeTab === 'customer' ? 'Customer:' : 'Supplier:'}</strong> {activeTab === 'customer' ? (searchResult as Transaction).customerName : suppliers.find(s => s.id === (searchResult as Purchase).supplierId)?.name}</p></div>
                            <div className="max-h-80 overflow-y-auto"><table className="w-full text-sm"><thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0"><tr><th className="p-2 text-left">Item</th><th className="p-2 text-left">Batch</th><th className="p-2 text-center">Original Qty</th><th className="p-2 w-32">Return Qty</th></tr></thead><tbody>
                            {(searchResult as Transaction | Purchase).items.map(item => { const key = `${item.productId}-${item.batchId}`; return (<tr key={key} className="border-t border-border"><td className="p-2">{item.productName}</td><td className="p-2">{products.find(p=>p.id === item.productId)?.batches.find(b=>b.id===item.batchId)?.batchNumber}</td><td className="p-2 text-center">{item.quantity}</td><td className="p-2"><input type="number" min="0" max={item.quantity} value={returnCart.get(key)?.returnQuantity || ''} onChange={e => handleReturnQuantityChange(key, item, e.target.value)} className="w-full p-1.5 text-center border border-border rounded-md bg-input focus:ring-2 focus:ring-ring" /></td></tr>); })}</tbody></table></div>
                        </div>
                    )}
                </div>

                <div className="bg-card rounded-xl border border-border p-6 space-y-4 flex flex-col">
                     <h2 className="text-2xl font-bold text-foreground">Return Summary</h2>
                     <div className="flex-grow space-y-2 text-sm">
                        {Array.from(returnCart.entries()).map(([key, {item, returnQuantity}]) => (<div key={key} className="flex justify-between items-center py-1"><span>{item.productName} x {returnQuantity}</span></div>))}
                     </div>
                     <div className="border-t border-border pt-4 mt-auto">
                         <div className="flex justify-between items-center text-xl font-bold mb-4"><span>Total Return Value:</span><span className="text-primary">₹{returnSummary.total.toFixed(2)}</span></div>
                        {activeTab === 'customer' && returnCart.size > 0 && (<div className="mb-4"><p className="text-sm font-semibold mb-2">Settlement Method</p><div className="flex gap-2 rounded-lg bg-input p-1.5 border border-border w-full">{ (['refund', 'voucher'] as const).map(s => (<button key={s} onClick={() => setSettlementType(s)} className={`px-3 py-1.5 text-sm rounded-md flex-1 capitalize ${settlementType === s ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-secondary/80'}`}>{s}</button>))}</div></div>)}
                        {activeTab === 'supplier' && searchResult && (<p className="text-sm text-center bg-secondary p-2 rounded-md">Original invoice was on <strong className="uppercase">{(searchResult as Purchase).status}</strong>. Return will be processed as a {(searchResult as Purchase).status === 'paid' ? 'Credit Note' : 'Ledger Adjustment'}.</p>)}
                         <button onClick={activeTab === 'customer' ? processCustomerReturn : processSupplierReturn} disabled={returnCart.size === 0} className="w-full mt-4 py-3 bg-success text-white rounded-lg text-lg font-semibold hover:bg-success/90 disabled:bg-muted disabled:cursor-not-allowed">Process Return</button>
                     </div>
                </div>
            </div>
            {viewedInvoice && <InvoiceDetailModal invoice={viewedInvoice} onClose={() => setViewedInvoice(null)} />}
            {finalizedReturn && <CreditNoteModal isOpen={true} onClose={() => { setFinalizedReturn(null); resetForm(); }} {...finalizedReturn} />}
            {printableVoucher && <VoucherPrintModal voucher={printableVoucher} onClose={() => { setPrintableVoucher(null); resetForm(); }} />}
        </div>
    );
};

export default Returns;