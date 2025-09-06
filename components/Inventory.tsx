import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../App';
import { Product, Purchase, Batch, MedicineSchedule, PurchaseStatus, Supplier } from '../types';
import { PlusIcon, XIcon, UploadIcon } from './Icons';
import BulkUploadModal from './BulkUploadModal';
import { SupplierModal } from './SupplierModal';

type PaymentMethod = 'cash' | 'bank' | 'upi';
type NewProductType = 'strip' | 'bottle' | 'tube' | 'other';

const AddStockModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (
        productData: Partial<Product>, 
        batchData: Omit<Batch, 'id'>, 
        purchaseStatus: PurchaseStatus, 
        supplierId: string,
        purchaseDetails: { invoiceNumber?: string; paymentMethod?: PaymentMethod; notes?: string },
        totalAmount: number
    ) => void;
    products: Product[];
}> = ({ isOpen, onClose, onSave, products }) => {
    
    const { suppliers, setSuppliers, purchases, gstSettings } = useContext(AppContext);
    const [product, setProduct] = useState<Partial<Product>>({ name: '', hsnCode: '', pack: '', manufacturer: '', salts: '', schedule: 'none' });
    const [batch, setBatch] = useState<Omit<Batch, 'id'>>({ batchNumber: '', expiryDate: '', stock: 0, mrp: 0, price: 0, discount: 0 });
    const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>('paid');
    const [existingProduct, setExistingProduct] = useState<Product | null>(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
    
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [notes, setNotes] = useState('');

    // State for Smart Pack Entry
    const [newProductType, setNewProductType] = useState<NewProductType>('strip');
    const [stripInfo, setStripInfo] = useState({ units: 10, type: 'tabs' });
    const [liquidInfo, setLiquidInfo] = useState({ volume: 200, unit: 'ml' });
    const [otherPack, setOtherPack] = useState('1 pc');


    useEffect(() => {
        if (!isOpen) {
            // Reset form when modal closes
            setProduct({ name: '', hsnCode: '', pack: '10 tabs', manufacturer: '', salts: '', schedule: 'none' });
            setBatch({ batchNumber: '', expiryDate: '', stock: 0, mrp: 0, price: 0, discount: 0 });
            setPurchaseStatus('paid');
            setExistingProduct(null);
            setSelectedSupplierId('');
            setPurchaseHistory([]);
            setInvoiceNumber('');
            setPaymentMethod('cash');
            setNotes('');
            setNewProductType('strip');
            setStripInfo({ units: 10, type: 'tabs' });
        }
    }, [isOpen]);

     useEffect(() => {
        if (selectedSupplierId) {
            const supplier = suppliers.find(s => s.id === selectedSupplierId);
            if (supplier && !existingProduct) { // Only apply default discount for new entries
                setBatch(b => ({ ...b, discount: supplier.defaultDiscount }));
            }
        }
    }, [selectedSupplierId, suppliers, existingProduct]);
    
    // Effect for Smart Pack Entry: auto-generate pack string for new products
    useEffect(() => {
        if (!existingProduct) {
            let generatedPack = '';
            switch (newProductType) {
                case 'strip':
                    generatedPack = `${stripInfo.units} ${stripInfo.type}`;
                    break;
                case 'bottle':
                    generatedPack = `${liquidInfo.volume}${liquidInfo.unit}`;
                    break;
                case 'tube':
                    generatedPack = `${otherPack}`; // Can be more specific if needed
                    break;
                case 'other':
                    generatedPack = `${otherPack}`;
                    break;
            }
            setProduct(p => ({ ...p, pack: generatedPack }));
        }
    }, [newProductType, stripInfo, liquidInfo, otherPack, existingProduct]);

    const summary = useMemo(() => {
        const { stock, price, discount } = batch;
        const { hsnCode } = product;

        if (!stock || !price) {
            return { baseAmount: 0, discountAmount: 0, subtotal: 0, gstAmount: 0, total: 0, gstRate: 0, cgst: 0, sgst: 0 };
        }

        const baseAmount = stock * price;
        const discountAmount = baseAmount * (discount / 100);
        const subtotal = baseAmount - discountAmount;

        const gstRate = hsnCode?.startsWith('3004')
            ? (gstSettings.general || 12)
            : hsnCode?.startsWith('2106')
            ? (gstSettings.food || 18)
            : (gstSettings.subsidized || 5);
        
        const gstAmount = subtotal * (gstRate / 100);
        const total = subtotal + gstAmount;
        const cgst = gstAmount / 2;
        const sgst = gstAmount / 2;

        return { baseAmount, discountAmount, subtotal, gstAmount, total, gstRate, cgst, sgst };
    }, [batch, product, gstSettings]);

    const handleProductNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setProduct(p => ({ ...p, name }));
        const foundProduct = products.find(p => p.name.toLowerCase() === name.toLowerCase());
        
        if (foundProduct) {
            setExistingProduct(foundProduct);
            setProduct({ ...foundProduct }); // Populate form with existing product data

            const relatedPurchases = purchases.filter(p => p.items.some(item => item.productId === foundProduct.id));
            const history = relatedPurchases.flatMap(p => {
                const supplier = suppliers.find(s => s.id === p.supplierId);
                return p.items.filter(item => item.productId === foundProduct.id).map(item => {
                    const batch = foundProduct.batches.find(b => b.id === item.batchId);
                    if (!batch) return null;
                    const taxRate = foundProduct.hsnCode.startsWith('3004') ? (gstSettings.general || 12) : (gstSettings.food || 18);
                    return {
                        id: `${p.id}-${item.batchId}`, supplierName: supplier?.name || 'Unknown', batchNumber: batch.batchNumber,
                        expiryDate: batch.expiryDate, stock: batch.stock, mrp: batch.mrp, price: batch.price, discount: batch.discount, gst: taxRate,
                    };
                }).filter(Boolean);
            });
            setPurchaseHistory(history as any[]);

        } else {
            setExistingProduct(null);
            setPurchaseHistory([]);
             setProduct(p => ({
                name: p.name || '',
                hsnCode: '',
                pack: p.pack || '',
                manufacturer: '',
                salts: '',
                schedule: 'none',
            }));
        }
    };

    const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProduct(prev => ({ ...prev, [name]: value }));
    };

    const handleBatchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setBatch(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'add_new') {
            setIsSupplierModalOpen(true);
        } else {
            setSelectedSupplierId(value);
        }
    };

    const handleSaveNewSupplier = (newSupplier: Supplier) => {
        setSuppliers(prev => {
            if (prev.some(s => s.id === newSupplier.id)) {
                return prev.map(s => s.id === newSupplier.id ? newSupplier : s);
            }
            return [...prev, newSupplier];
        });
        setSelectedSupplierId(newSupplier.id);
        setIsSupplierModalOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSupplierId) {
            alert('Please select a supplier.');
            return;
        }
        onSave(
            { id: existingProduct?.id, ...product }, 
            batch, 
            purchaseStatus, 
            selectedSupplierId,
            { invoiceNumber, paymentMethod, notes },
            summary.total
        );
        onClose();
    };
    
    if (!isOpen) return null;
    
    const inputClass = "w-full p-3 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring transition-colors disabled:bg-secondary";
    const labelClass = "block text-sm font-semibold text-muted-foreground mb-1";
    
    const renderPackInputs = () => {
        switch (newProductType) {
            case 'strip':
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <label className={labelClass}>Units per Strip</label>
                            <div className="w-full p-3 border border-border rounded-lg bg-secondary text-foreground">10</div>
                        </div>
                        <div className="flex-1">
                            <label className={labelClass}>Unit Type</label>
                            <div className="flex gap-1 rounded-lg bg-background p-1 border border-border w-full">
                                {['tabs', 'caps'].map(t => 
                                    <button type="button" key={t} onClick={() => setStripInfo(s => ({...s, type: t}))} className={`px-3 py-1.5 text-sm rounded-md flex-1 capitalize ${stripInfo.type === t ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-secondary/80'}`}>{t}</button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'bottle':
                 return (
                    <div className="flex items-center gap-2">
                        <div className="flex-1"><label className={labelClass}>Volume</label><input type="number" value={liquidInfo.volume} onChange={e => setLiquidInfo(s => ({...s, volume: parseInt(e.target.value) || 0}))} className={inputClass} /></div>
                        <div className="flex-1"><label className={labelClass}>Unit</label><select value={liquidInfo.unit} onChange={e => setLiquidInfo(s => ({...s, unit: e.target.value}))} className={inputClass}><option value="ml">ml</option><option value="L">L</option></select></div>
                    </div>
                );
            case 'tube':
            case 'other':
                return <div><label className={labelClass}>Pack Description</label><input type="text" value={otherPack} onChange={e => setOtherPack(e.target.value)} className={inputClass} placeholder="e.g., 30g tube, 1 pc"/></div>
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-card text-card-foreground rounded-xl p-6 w-full max-w-4xl m-4 max-h-[90vh] flex flex-col border border-border shadow-2xl">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold">{existingProduct ? 'Add New Stock' : 'Add New Product'}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon /></button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="p-4 border border-border rounded-lg">
                            <h3 className="font-bold mb-3 text-lg">Supplier & Purchase Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Supplier</label>
                                    <select value={selectedSupplierId} onChange={handleSupplierChange} required className={inputClass}>
                                        <option value="" disabled>Select a supplier</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        <option value="add_new" className="font-bold text-primary">-- Add New Supplier --</option>
                                    </select>
                                </div>
                                <div><label className={labelClass}>Invoice Number</label><input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className={inputClass} /></div>
                                <div>
                                    <label className={labelClass}>Purchase Status</label>
                                    <div className="flex gap-2 rounded-lg bg-input p-1.5 border border-border w-full">{ (['paid', 'credit'] as PurchaseStatus[]).map(s => (
                                        <button type="button" key={s} onClick={() => setPurchaseStatus(s)} className={`px-3 py-1.5 text-sm rounded-md flex-1 capitalize ${purchaseStatus === s ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-secondary/80'}`}>{s}</button>
                                    ))}</div>
                                </div>
                                {purchaseStatus === 'paid' && (
                                    <div>
                                        <label className={labelClass}>Payment Method</label>
                                        <div className="flex gap-2 rounded-lg bg-input p-1.5 border border-border w-full">{ (['cash', 'bank', 'upi'] as PaymentMethod[]).map(m => (
                                            <button type="button" key={m} onClick={() => setPaymentMethod(m)} className={`px-3 py-1.5 text-sm rounded-md flex-1 capitalize ${paymentMethod === m ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-secondary/80'}`}>{m}</button>
                                        ))}</div>
                                    </div>
                                )}
                                <div className="md:col-span-2"><label className={labelClass}>Additional Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} min-h-[60px]`} /></div>
                            </div>
                        </div>
                        
                        <div className="p-4 border border-border rounded-lg">
                            <h3 className="font-bold mb-3 text-lg">Medicine & Batch Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className={labelClass}>Product Name</label><input type="text" name="name" value={product.name || ''} onChange={handleProductNameChange} required className={inputClass} list="product-names" placeholder="Search or enter new medicine"/></div>
                                <datalist id="product-names">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
                                <div><label className={labelClass}>HSN Code</label><input type="text" name="hsnCode" value={product.hsnCode || ''} onChange={handleProductChange} required className={inputClass} disabled={!!existingProduct} /></div>
                                
                                {existingProduct ? (
                                    <div><label className={labelClass}>Pack Size</label><input type="text" value={product.pack || ''} className={inputClass} disabled /></div>
                                ) : (
                                    <div className="md:col-span-2">
                                        <label className={labelClass}>Product Type</label>
                                        <div className="flex flex-wrap gap-1 rounded-lg bg-input p-1.5 border border-border mb-2">{ (['strip', 'bottle', 'tube', 'other'] as NewProductType[]).map(t => (
                                            <button type="button" key={t} onClick={() => setNewProductType(t)} disabled={!!existingProduct} className={`px-3 py-1.5 text-sm rounded-md flex-1 capitalize ${newProductType === t ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-secondary/80'}`}>{t === 'strip' ? 'Tablets/Caps' : t}</button>
                                        ))}</div>
                                        {renderPackInputs()}
                                    </div>
                                )}

                                <div><label className={labelClass}>Manufacturer</label><input type="text" name="manufacturer" value={product.manufacturer || ''} onChange={handleProductChange} required className={inputClass} disabled={!!existingProduct} /></div>
                                <div className="md:col-span-2"><label className={labelClass}>Salts / Composition</label><textarea name="salts" value={product.salts || ''} onChange={handleProductChange} className={`${inputClass} min-h-[60px]`} disabled={!!existingProduct} /></div>
                                <div>
                                    <label className={labelClass}>Medicine Schedule</label>
                                    <div className="flex flex-wrap gap-2 rounded-lg bg-input p-1.5 border border-border">{ (['none', 'H', 'H1', 'narcotic', 'tb'] as MedicineSchedule[]).map(s => (
                                        <button type="button" key={s} onClick={() => !existingProduct && setProduct(p => ({ ...p, schedule: s }))} disabled={!!existingProduct} className={`px-3 py-1.5 text-sm rounded-md flex-1 capitalize ${product.schedule === s ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-secondary/80'}`}>{s}</button>
                                    ))}</div>
                                </div>
                            </div>
                            <h4 className="font-semibold mt-6 mb-3 text-md border-t border-border pt-4">New Batch Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label className={labelClass}>Batch Number</label><input type="text" name="batchNumber" value={batch.batchNumber} onChange={handleBatchChange} required className={inputClass} /></div>
                                <div><label className={labelClass}>Expiry Date</label><input type="date" name="expiryDate" value={batch.expiryDate} onChange={handleBatchChange} required className={inputClass} /></div>
                                <div><label className={labelClass}>Quantity / Stock</label><input type="number" name="stock" value={batch.stock} onChange={handleBatchChange} required className={inputClass} min="0" /></div>
                                <div><label className={labelClass}>MRP</label><input type="number" name="mrp" value={batch.mrp} onChange={handleBatchChange} required className={inputClass} min="0" step="0.01" /></div>
                                <div><label className={labelClass}>Purchase Price</label><input type="number" name="price" value={batch.price} onChange={handleBatchChange} required className={inputClass} min="0" step="0.01" /></div>
                                <div><label className={labelClass}>Discount (%)</label><input type="number" name="discount" value={batch.discount} onChange={handleBatchChange} className={inputClass} min="0" /></div>
                            </div>
                        </div>

                        {purchaseHistory.length > 0 && (
                            <div className="p-4 border border-border rounded-lg">
                                <h3 className="font-bold mb-2 text-lg">Purchase History for {product.name}</h3>
                                <div className="max-h-48 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground uppercase bg-secondary sticky top-0 z-10"><tr>
                                        <th className="p-2">Supplier</th><th className="p-2">Batch No</th><th className="p-2">Expiry</th><th className="p-2">Stock</th><th className="p-2">MRP</th><th className="p-2">Pur. Price</th><th className="p-2">Disc%</th><th className="p-2">GST%</th>
                                    </tr></thead>
                                    <tbody>{purchaseHistory.map(item => (
                                        <tr key={item.id} className="border-t border-border"><td className="p-2 font-semibold">{item.supplierName}</td><td className="p-2">{item.batchNumber}</td><td className="p-2">{item.expiryDate.split('-').reverse().join('-')}</td><td className="p-2">{item.stock}</td><td className="p-2">₹{item.mrp.toFixed(2)}</td><td className="p-2 font-bold text-primary">₹{item.price.toFixed(2)}</td><td className="p-2">{item.discount}%</td><td className="p-2">{item.gst}%</td></tr>
                                    ))}</tbody>
                                </table>
                                </div>
                            </div>
                        )}
                        
                        <div className="p-4 border border-border rounded-lg">
                            <h3 className="font-bold text-lg mb-2">Purchase Summary</h3>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Gross Amount</span><span className="font-semibold">₹{summary.baseAmount.toFixed(2)}</span></div>
                                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Discount</span><span className="font-semibold text-destructive">- ₹{summary.discountAmount.toFixed(2)}</span></div>
                                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">Subtotal (Taxable)</span><span className="font-semibold">₹{summary.subtotal.toFixed(2)}</span></div>
                                <div className="flex justify-between py-1 border-b border-border/50"><span className="text-muted-foreground">SGST @ {summary.gstRate/2}%</span><span className="font-semibold">+ ₹{summary.sgst.toFixed(2)}</span></div>
                                <div className="flex justify-between py-1"><span className="text-muted-foreground">CGST @ {summary.gstRate/2}%</span><span className="font-semibold">+ ₹{summary.cgst.toFixed(2)}</span></div>
                            </div>
                            <div className="flex justify-between text-base font-bold mt-3 pt-3 border-t border-border"><span className="text-foreground">Grand Total</span><span className="text-primary">₹{summary.total.toFixed(2)}</span></div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 flex-shrink-0">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold">Cancel</button>
                            <button type="submit" className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md">Save Stock</button>
                        </div>
                    </form>
                </div>
                <SupplierModal 
                    isOpen={isSupplierModalOpen}
                    onClose={() => setIsSupplierModalOpen(false)}
                    onSave={handleSaveNewSupplier}
                />
            </div>
        </div>
    );
};


const Inventory: React.FC = () => {
    const { products, setProducts, purchases, setPurchases, inventoryFilter, setInventoryFilter, suppliers, gstSettings } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [expandedProducts, setExpandedProducts] = useState<string[]>([]);

    const toggleProductDetails = (productId: string) => {
        setExpandedProducts(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const filteredProducts = useMemo(() => {
        const productsWithTotalStock = products.map(p => ({
            ...p,
            totalStock: p.batches.reduce((sum, b) => sum + b.stock, 0)
        }));

        let results = productsWithTotalStock;
        
        if (inventoryFilter.status === 'low_stock') {
            results = results.filter(p => p.totalStock > 0 && p.totalStock < 20);
        }

        if (searchTerm) {
            results = results.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.salts && p.salts.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        
        return results;
    }, [products, searchTerm, inventoryFilter]);

    const handleSaveStock = (
        productData: Partial<Product>,
        batchData: Omit<Batch, 'id'>,
        purchaseStatus: PurchaseStatus,
        supplierId: string,
        purchaseDetails: { invoiceNumber?: string; paymentMethod?: PaymentMethod; notes?: string },
        totalAmount: number
    ) => {
        const newBatch: Batch = { ...batchData, id: `batch_${Date.now()}` };
        let updatedProduct: Product;

        setProducts(prev => {
            const existingProductIndex = prev.findIndex(p => p.id === productData.id || (productData.name && p.name.toLowerCase() === productData.name.toLowerCase()));

            if (existingProductIndex > -1) { // Existing Product, add new batch
                const productsCopy = [...prev];
                const productToUpdate = { ...productsCopy[existingProductIndex] };
                productToUpdate.batches = [...productToUpdate.batches, newBatch];
                productsCopy[existingProductIndex] = productToUpdate;
                updatedProduct = productToUpdate;
                return productsCopy;
            } else { // New Product
                updatedProduct = {
                    id: `prod_${Date.now()}`,
                    name: productData.name!,
                    hsnCode: productData.hsnCode!,
                    pack: productData.pack!,
                    manufacturer: productData.manufacturer!,
                    salts: productData.salts,
                    schedule: productData.schedule,
                    batches: [newBatch]
                };
                return [...prev, updatedProduct];
            }
        });

        const purchaseSubtotal = (newBatch.stock * newBatch.price) * (1 - (newBatch.discount / 100));
        const newPurchase: Purchase = {
            id: `purch_${Date.now()}`,
            supplierId: supplierId,
            status: purchaseStatus,
            invoiceNumber: purchaseDetails.invoiceNumber,
            paymentMethod: purchaseStatus === 'paid' ? purchaseDetails.paymentMethod : undefined,
            notes: purchaseDetails.notes,
            items: [{
                productId: updatedProduct!.id,
                productName: updatedProduct!.name,
                batchId: newBatch.id,
                quantity: newBatch.stock,
                price: newBatch.price,
                amount: parseFloat(purchaseSubtotal.toFixed(2)),
            }],
            total: totalAmount,
            date: new Date().toISOString(),
        };
        setPurchases(prev => [...prev, newPurchase]);
    };
    
     const handleBulkSave = (newProducts: any[], purchaseStatus: PurchaseStatus, supplierId: string) => {
        const timestamp = Date.now();
        let purchaseTotal = 0;
        const purchaseItems: any[] = [];

        setProducts(prev => {
            const productsCopy = [...prev];

            newProducts.forEach((newProd, index) => {
                const newBatch: Batch = {
                    id: `batch_${timestamp}_${index}`,
                    batchNumber: newProd.batchNumber,
                    expiryDate: newProd.expiryDate,
                    stock: newProd.stock,
                    mrp: newProd.mrp,
                    price: newProd.price,
                    discount: newProd.discount,
                };
                
                const purchaseAmount = newProd.amount > 0 ? newProd.amount : (newBatch.stock * newBatch.price) * (1 - (newBatch.discount / 100));
                purchaseTotal += purchaseAmount; // Note: This doesn't include tax for bulk uploads yet.

                const existingProductIndex = productsCopy.findIndex(p => p.name.toLowerCase() === newProd.name.toLowerCase());
                let productId;

                if (existingProductIndex > -1) { // Existing Product
                    const productToUpdate = { ...productsCopy[existingProductIndex] };
                    productToUpdate.batches.push(newBatch);
                    productsCopy[existingProductIndex] = productToUpdate;
                    productId = productToUpdate.id;
                } else { // New Product
                     const productToAdd: Product = {
                        id: `prod_${timestamp}_${index}`,
                        name: newProd.name,
                        hsnCode: newProd.hsnCode,
                        pack: newProd.pack,
                        manufacturer: newProd.manufacturer,
                        salts: newProd.salts,
                        schedule: newProd.schedule,
                        batches: [newBatch]
                    };
                    productsCopy.push(productToAdd);
                    productId = productToAdd.id;
                }

                purchaseItems.push({
                    productId: productId,
                    productName: newProd.name,
                    batchId: newBatch.id,
                    quantity: newBatch.stock,
                    price: newBatch.price,
                    amount: parseFloat(purchaseAmount.toFixed(2)),
                });
            });

            return productsCopy;
        });

        if (purchaseItems.length > 0) {
            const newPurchase: Purchase = {
                id: `purch_bulk_${timestamp}`,
                supplierId,
                status: purchaseStatus,
                items: purchaseItems,
                total: parseFloat(purchaseTotal.toFixed(2)), // Note: This total is pre-tax.
                date: new Date().toISOString(),
            };
            setPurchases(prev => [...prev, newPurchase]);
        }
    };


    const handleClearFilter = () => setInventoryFilter({ status: 'all' });

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
                <div className="flex space-x-2">
                    <button onClick={() => setIsBulkUploadModalOpen(true)} className="flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 font-semibold"><UploadIcon className="mr-2"/>Bulk Upload</button>
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold shadow-md"><PlusIcon className="mr-2"/>Add Stock</button>
                </div>
            </div>

            <div className="mb-6"><input type="text" placeholder="Search by name, manufacturer, or salts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-3 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring"/></div>

            {inventoryFilter.status !== 'all' && (
                <div className="flex items-center gap-3 bg-accent text-accent-foreground p-3 rounded-lg mb-6">
                    <span className="font-semibold text-sm">Showing: {inventoryFilter.status === 'low_stock' ? 'Low Stock Items' : 'Other Filter'}</span>
                    <button onClick={handleClearFilter} className="flex items-center gap-1 text-sm font-bold hover:underline"><XIcon className="w-4 h-4"/> Clear Filter</button>
                </div>
            )}

            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="max-h-[calc(100vh_-_22rem)] overflow-y-auto">
                    <table className="w-full text-sm text-left text-foreground">
                        <thead className="text-xs text-muted-foreground uppercase bg-secondary sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="px-6 py-3 font-semibold w-1/3">Product</th>
                                <th scope="col" className="px-6 py-3 font-semibold w-1/4">Manufacturer</th>
                                <th scope="col" className="px-6 py-3 font-semibold w-[10%] text-center">Schedule</th>
                                <th scope="col" className="px-6 py-3 font-semibold w-[15%] text-center">Total Stock</th>
                                <th scope="col" className="px-6 py-3 font-semibold w-[15%] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                        {filteredProducts.flatMap(p => {
                            const isExpanded = expandedProducts.includes(p.id);
                            const mainRow = (
                                <tr key={p.id} className="cursor-pointer hover:bg-secondary/50 border-b border-border" onClick={() => toggleProductDetails(p.id)}>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-foreground">{p.name}</p>
                                        <p className="text-xs text-muted-foreground">{p.salts || 'No composition info'}</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{p.manufacturer}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 uppercase">{p.schedule || 'none'}</span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-lg text-center">{p.totalStock}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-primary font-semibold text-xs">
                                            {isExpanded ? 'Hide Batches' : 'View Batches'}
                                        </span>
                                    </td>
                                </tr>
                            );

                            if (!isExpanded) return [mainRow];

                            const batchHeader = p.batches.length > 0 ? (
                                <tr key={`${p.id}-batch-header`} className="bg-secondary text-xs text-muted-foreground font-medium">
                                    <td className="px-6 py-1 pl-10">Batch / Supplier / Invoice</td>
                                    <td className="px-6 py-1">Expiry</td>
                                    <td className="px-6 py-1 text-center">Stock</td>
                                    <td className="px-6 py-1 text-center">MRP / Rate</td>
                                    <td className="px-6 py-1 text-right">Discount / GST</td>
                                </tr>
                            ) : null;

                            const batchRows = p.batches.map(b => {
                                const purchase = purchases.find(pur => pur.items.some(item => item.batchId === b.id));
                                const supplier = purchase ? suppliers.find(s => s.id === purchase.supplierId) : null;
                                const gstRate = p.hsnCode?.startsWith('3004') ? (gstSettings.general || 12) : p.hsnCode?.startsWith('2106') ? (gstSettings.food || 18) : (gstSettings.subsidized || 5);
                                return (
                                    <tr key={b.id} className="bg-secondary/40 hover:bg-secondary/60 border-t border-border/50">
                                        <td className="px-6 py-2 pl-10">
                                            <p className="font-semibold text-sm">{b.batchNumber}</p>
                                            <p className="text-xs text-muted-foreground">{supplier?.name || 'N/A'}</p>
                                            <p className="text-xs text-muted-foreground">{purchase?.invoiceNumber || 'N/A'}</p>
                                        </td>
                                        <td className="px-6 py-2 text-sm whitespace-nowrap">{b.expiryDate.split('-').reverse().join('-')}</td>
                                        <td className="px-6 py-2 text-sm text-center font-bold">{b.stock}</td>
                                        <td className="px-6 py-2 text-sm text-center">
                                            <span>₹{b.mrp.toFixed(2)} <span className="text-muted-foreground">/ ₹{b.price.toFixed(2)}</span></span>
                                        </td>
                                        <td className="px-6 py-2 text-sm text-right">
                                            <span>{b.discount}% <span className="text-muted-foreground">/ {gstRate}%</span></span>
                                        </td>
                                    </tr>
                                );
                            });
                            
                             const noBatchesRow = p.batches.length === 0 ? (
                                <tr key={`${p.id}-no-batches`} className="bg-secondary/40">
                                    <td colSpan={5} className="px-6 py-3 text-center text-muted-foreground text-sm">No batches found for this product.</td>
                                </tr>
                            ) : null;

                            return [mainRow, batchHeader, ...batchRows, noBatchesRow].filter(Boolean);
                        })}
                        </tbody>
                    </table>
                    {filteredProducts.length === 0 && <p className="text-center py-8 text-muted-foreground">No products found.</p>}
                </div>
            </div>

            <AddStockModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveStock}
                products={products}
            />
            <BulkUploadModal
                isOpen={isBulkUploadModalOpen}
                onClose={() => setIsBulkUploadModalOpen(false)}
                onSave={handleBulkSave}
                suppliers={suppliers}
            />
        </div>
    );
};

export default Inventory;