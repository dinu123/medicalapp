import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { AppContext } from '../App';
import { Product, Purchase, Batch, MedicineSchedule, PurchaseStatus, Supplier, InventoryFilterStatus, OrderListItem, PurchaseOrder } from '../types';
import { PlusIcon, XIcon, UploadIcon, TotalItemsIcon, LowStockIcon, OutOfStockIcon, TotalValueIcon, ActionsIcon, ChevronDownIcon, ExportIcon, SearchIcon } from './Icons';
import BulkUploadModal from './BulkUploadModal';
import { SupplierModal } from './SupplierModal';

type PaymentMethod = 'cash' | 'bank' | 'upi';
type NewProductType = 'strip' | 'bottle' | 'tube' | 'other';
type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';
type StockStatusFilter = 'all' | 'low_stock' | 'out_of_stock';
type TagFilter = 'all' | 'ordered' | 'order_later';


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
    const [product, setProduct] = useState<Partial<Product>>({ name: '', hsnCode: '', pack: '', manufacturer: '', salts: '', schedule: 'none', category: '', minStock: 20 });
    const [batch, setBatch] = useState<Omit<Batch, 'id'>>({ batchNumber: '', expiryDate: '', stock: 0, mrp: 0, price: 0, discount: 0 });
    const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>('paid');
    const [existingProduct, setExistingProduct] = useState<Product | null>(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
    
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [notes, setNotes] = useState('');

    const [newProductType, setNewProductType] = useState<NewProductType>('strip');
    const [stripInfo, setStripInfo] = useState({ units: 10, type: 'tabs' });
    const [liquidInfo, setLiquidInfo] = useState({ volume: 200, unit: 'ml' });
    const [otherPack, setOtherPack] = useState('1 pc');


    useEffect(() => {
        if (!isOpen) {
            setProduct({ name: '', hsnCode: '', pack: '10 tabs', manufacturer: '', salts: '', schedule: 'none', category: '', minStock: 20 });
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
            if (supplier && !existingProduct) {
                setBatch(b => ({ ...b, discount: supplier.defaultDiscount }));
            }
        }
    }, [selectedSupplierId, suppliers, existingProduct]);
    
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
            setProduct({ ...foundProduct });

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
                category: '',
                minStock: 20,
            }));
        }
    };

    const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setProduct(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
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
                return ( <div className="flex items-center gap-2"> <div className="flex-1"> <label className={labelClass}>Units per Strip</label> <div className="w-full p-3 border border-border rounded-lg bg-secondary text-foreground">10</div> </div> <div className="flex-1"> <label className={labelClass}>Unit Type</label> <div className="flex gap-1 rounded-lg bg-background p-1 border border-border w-full"> {['tabs', 'caps'].map(t => <button type="button" key={t} onClick={() => setStripInfo(s => ({...s, type: t}))} className={`px-3 py-1.5 text-sm rounded-md flex-1 capitalize ${stripInfo.type === t ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-secondary/80'}`}>{t}</button> )} </div> </div> </div> );
            case 'bottle':
                 return ( <div className="flex items-center gap-2"> <div className="flex-1"><label className={labelClass}>Volume</label><input type="number" value={liquidInfo.volume} onChange={e => setLiquidInfo(s => ({...s, volume: parseInt(e.target.value) || 0}))} className={inputClass} /></div> <div className="flex-1"><label className={labelClass}>Unit</label><select value={liquidInfo.unit} onChange={e => setLiquidInfo(s => ({...s, unit: e.target.value}))} className={inputClass}><option value="ml">ml</option><option value="L">L</option></select></div> </div> );
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
                                <div> <label className={labelClass}>Supplier</label> <select value={selectedSupplierId} onChange={handleSupplierChange} required className={inputClass}> <option value="" disabled>Select a supplier</option> {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)} <option value="add_new" className="font-bold text-primary">-- Add New Supplier --</option> </select> </div>
                                <div><label className={labelClass}>Invoice Number</label><input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className={inputClass} /></div>
                                <div> <label className={labelClass}>Purchase Status</label> <div className="flex gap-2 rounded-lg bg-input p-1.5 border border-border w-full">{ (['paid', 'credit'] as PurchaseStatus[]).map(s => ( <button type="button" key={s} onClick={() => setPurchaseStatus(s)} className={`px-3 py-1.5 text-sm rounded-md flex-1 capitalize ${purchaseStatus === s ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-secondary/80'}`}>{s}</button> ))}</div> </div>
                                {purchaseStatus === 'paid' && ( <div> <label className={labelClass}>Payment Method</label> <div className="flex gap-2 rounded-lg bg-input p-1.5 border border-border w-full">{ (['cash', 'bank', 'upi'] as PaymentMethod[]).map(m => ( <button type="button" key={m} onClick={() => setPaymentMethod(m)} className={`px-3 py-1.5 text-sm rounded-md flex-1 capitalize ${paymentMethod === m ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-secondary/80'}`}>{m}</button> ))}</div> </div> )}
                                <div className="md:col-span-2"><label className={labelClass}>Additional Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} min-h-[60px]`} /></div>
                            </div>
                        </div>
                        
                        <div className="p-4 border border-border rounded-lg">
                            <h3 className="font-bold mb-3 text-lg">Medicine & Batch Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className={labelClass}>Product Name</label><input type="text" name="name" value={product.name || ''} onChange={handleProductNameChange} required className={inputClass} list="product-names" placeholder="Search or enter new medicine"/></div>
                                <datalist id="product-names">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
                                <div><label className={labelClass}>HSN Code</label><input type="text" name="hsnCode" value={product.hsnCode || ''} onChange={handleProductChange} required className={inputClass} disabled={!!existingProduct} /></div>
                                
                                {existingProduct ? ( <div><label className={labelClass}>Pack Size</label><input type="text" value={product.pack || ''} className={inputClass} disabled /></div> ) : ( <div className="md:col-span-2"> <label className={labelClass}>Product Type</label> <div className="flex flex-wrap gap-1 rounded-lg bg-input p-1.5 border border-border mb-2">{ (['strip', 'bottle', 'tube', 'other'] as NewProductType[]).map(t => ( <button type="button" key={t} onClick={() => setNewProductType(t)} disabled={!!existingProduct} className={`px-3 py-1.5 text-sm rounded-md flex-1 capitalize ${newProductType === t ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-secondary/80'}`}>{t === 'strip' ? 'Tablets/Caps' : t}</button> ))}</div> {renderPackInputs()} </div> )}

                                <div><label className={labelClass}>Manufacturer</label><input type="text" name="manufacturer" value={product.manufacturer || ''} onChange={handleProductChange} required className={inputClass} disabled={!!existingProduct} /></div>
                                <div><label className={labelClass}>Category</label><input type="text" name="category" value={product.category || ''} onChange={handleProductChange} required className={inputClass} disabled={!!existingProduct} /></div>
                                <div><label className={labelClass}>Minimum Stock</label><input type="number" name="minStock" value={product.minStock || ''} onChange={handleProductChange} required className={inputClass} disabled={!!existingProduct} min="0"/></div>
                                <div className="md:col-span-2"><label className={labelClass}>Salts / Composition</label><textarea name="salts" value={product.salts || ''} onChange={handleProductChange} className={`${inputClass} min-h-[60px]`} disabled={!!existingProduct} /></div>
                                <div> <label className={labelClass}>Medicine Schedule</label> <div className="flex flex-wrap gap-2 rounded-lg bg-input p-1.5 border border-border">{ (['none', 'H', 'H1', 'narcotic', 'tb'] as MedicineSchedule[]).map(s => ( <button type="button" key={s} onClick={() => !existingProduct && setProduct(p => ({ ...p, schedule: s }))} disabled={!!existingProduct} className={`px-3 py-1.5 text-sm rounded-md flex-1 capitalize ${product.schedule === s ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-secondary/80'}`}>{s}</button> ))}</div> </div>
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

const StatCard: React.FC<{ title: string; value: string; subtitle: string; icon: React.ReactNode; iconBgColor: string; }> = ({ title, value, subtitle, icon, iconBgColor }) => (
    <div className="bg-card border border-border p-5 rounded-xl flex items-start space-x-4">
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
    </div>
);


const EditProductModal: React.FC<{
    product: Product | null;
    onClose: () => void;
    onSave: (updatedProduct: Product) => void;
}> = ({ product, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Product>>({});

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                manufacturer: product.manufacturer,
                category: product.category,
                minStock: product.minStock,
            });
        }
    }, [product]);

    if (!product) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...product, ...formData });
    };

    const inputClass = "w-full p-3 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring";
    const labelClass = "block text-sm font-semibold text-muted-foreground mb-1";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-card text-card-foreground rounded-xl p-6 w-full max-w-lg m-4 border border-border shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Edit {product.name}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className={labelClass}>Product Name</label><input type="text" name="name" value={formData.name || ''} onChange={handleChange} className={inputClass} required /></div>
                    <div><label className={labelClass}>Manufacturer</label><input type="text" name="manufacturer" value={formData.manufacturer || ''} onChange={handleChange} className={inputClass} required /></div>
                    <div><label className={labelClass}>Category</label><input type="text" name="category" value={formData.category || ''} onChange={handleChange} className={inputClass} /></div>
                    <div><label className={labelClass}>Minimum Stock</label><input type="number" name="minStock" value={formData.minStock || 0} onChange={handleChange} className={inputClass} required /></div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DeleteConfirmationModal: React.FC<{
    product: Product | null;
    onClose: () => void;
    onConfirm: (productId: string) => void;
}> = ({ product, onClose, onConfirm }) => {
    if (!product) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-card text-card-foreground rounded-xl p-6 w-full max-w-md m-4 border border-border shadow-2xl">
                <h2 className="text-2xl font-bold">Confirm Deletion</h2>
                <p className="my-4 text-muted-foreground">Are you sure you want to delete <strong>{product.name}</strong>? This action cannot be undone.</p>
                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold">Cancel</button>
                    <button onClick={() => onConfirm(product.id)} className="px-5 py-2.5 rounded-lg bg-destructive text-white hover:bg-destructive/90 font-semibold shadow-md">Delete</button>
                </div>
            </div>
        </div>
    );
};

const PurchaseOrderList: React.FC = () => {
    const { orderList, setOrderList, suppliers, setPurchaseOrders, setActivePage, setProducts, products, purchases } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (searchTerm.length > 1) {
            const lowerCaseTerm = searchTerm.toLowerCase();
            const results = products.filter(p => p.name.toLowerCase().includes(lowerCaseTerm)).slice(0, 5);
            setSearchResults(results);
            setShowResults(true);
        } else {
            setSearchResults([]);
            setShowResults(false);
        }
    }, [searchTerm, products]);

    const handleAddItemToOrder = (product: Product) => {
        // This logic is duplicated from the main component's handleAddToOrder
        const productPurchases = purchases.filter(p => p.items.some(item => item.productId === product.id));
        let bestSupplierId = '';
        let bestRate = Infinity;
        let bestMrp = 0;

        if (productPurchases.length > 0) {
            productPurchases.forEach(p => p.items.forEach(item => {
                if (item.productId === product.id && item.price < bestRate) {
                    bestRate = item.price;
                    bestSupplierId = p.supplierId;
                    bestMrp = product.batches.find(b => b.id === item.batchId)?.mrp || 0;
                }
            }));
        } else {
            const supplierWithBestDiscount = suppliers.sort((a, b) => b.defaultDiscount - a.defaultDiscount)[0];
            if (supplierWithBestDiscount) bestSupplierId = supplierWithBestDiscount.id;
        }
        if (!bestSupplierId && suppliers.length > 0) bestSupplierId = suppliers[0].id;
        
        const typicalBatch = product.batches.find(b => b.stock > 0);
        if (bestRate === Infinity) bestRate = typicalBatch ? typicalBatch.price : 0;
        if (bestMrp === 0) bestMrp = typicalBatch ? typicalBatch.mrp : 0;

        setOrderList(prev => {
            if (prev.some(item => item.productId === product.id)) return prev;
            return [...prev, {
                productId: product.id, productName: product.name, manufacturer: product.manufacturer,
                pack: product.pack, selectedSupplierId: bestSupplierId, quantity: 1, rate: bestRate, mrp: bestMrp
            }];
        });
        setSearchTerm('');
        setShowResults(false);
    };


    if (orderList.length === 0) return null;
    
    const handleQuantityChange = (productId: string, newQuantity: number) => {
        setOrderList(prev => prev.map(item => item.productId === productId ? {...item, quantity: newQuantity < 0 ? 0 : newQuantity} : item));
    }
    
    const handleSupplierChange = (productId: string, newSupplierId: string) => {
        setOrderList(prev => prev.map(item => item.productId === productId ? {...item, selectedSupplierId: newSupplierId} : item));
    }
    
    const handleRemoveItem = (productId: string) => {
        setOrderList(prev => prev.filter(item => item.productId !== productId));
    }

    const handleCreatePurchaseOrder = () => {
        if (orderList.length === 0) return;

        const primarySupplierId = orderList[0].selectedSupplierId;
        const totalOrderValue = orderList.reduce((sum, item) => sum + (item.rate * item.quantity), 0);

        const newPO: PurchaseOrder = {
            id: `PO-${Date.now()}`,
            supplierId: primarySupplierId,
            items: orderList,
            createdDate: new Date().toISOString(),
            status: 'ordered',
            totalValue: totalOrderValue,
        };

        setPurchaseOrders(prev => [...prev, newPO]);

        const orderedProductIds = orderList.map(item => item.productId);
        setProducts(prevProducts =>
            prevProducts.map(p =>
                orderedProductIds.includes(p.id) ? { ...p, isOrdered: true } : p
            )
        );
        
        setOrderList([]);
        setActivePage('purchase-orders');
    };

    const totalOrderValue = orderList.reduce((sum, item) => sum + (item.rate * item.quantity), 0);

    return (
        <div className="mt-6 bg-card rounded-xl border border-border p-5">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-foreground">Purchase Order List</h2>
                <button onClick={() => setOrderList([])} className="text-sm font-semibold text-destructive hover:underline">Clear List</button>
            </div>
             <div ref={searchRef} className="relative mb-4">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search to add more products..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-3 pl-10 border border-border rounded-lg bg-input"
                />
                {showResults && (
                    <ul className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                        {searchResults.length > 0 ? searchResults.map(p => (
                            <li key={p.id} onClick={() => handleAddItemToOrder(p)} className="p-3 cursor-pointer hover:bg-secondary/50">
                                <p className="font-semibold">{p.name}</p>
                            </li>
                        )) : <li className="p-3 text-center text-muted-foreground">No products found.</li>}
                    </ul>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-foreground min-w-[800px]">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Product</th>
                            <th className="px-4 py-3 font-semibold">Supplier</th>
                            <th className="px-4 py-3 font-semibold text-center">Qty</th>
                            <th className="px-4 py-3 font-semibold text-right">Rate</th>
                            <th className="px-4 py-3 font-semibold text-right">Amount</th>
                            <th className="px-4 py-3 font-semibold text-center"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {orderList.map(item => (
                            <tr key={item.productId} className="border-t border-border">
                                <td className="px-4 py-3">
                                    <p className="font-semibold">{item.productName}</p>
                                    <p className="text-xs text-muted-foreground">{item.manufacturer} ({item.pack})</p>
                                </td>
                                <td className="px-4 py-3">
                                    <select value={item.selectedSupplierId} onChange={e => handleSupplierChange(item.productId, e.target.value)} className="w-full p-2 border border-border rounded-md bg-input focus:ring-1 focus:ring-ring">
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </td>
                                <td className="px-4 py-3">
                                    <input type="number" value={item.quantity} onChange={e => handleQuantityChange(item.productId, parseInt(e.target.value) || 0)} className="w-20 p-2 text-center border border-border rounded-md bg-input"/>
                                </td>
                                <td className="px-4 py-3 text-right">₹{item.rate.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right font-bold">₹{(item.rate * item.quantity).toFixed(2)}</td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => handleRemoveItem(item.productId)} className="text-destructive"><XIcon className="w-5 h-5"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-border">
                            <td colSpan={4} className="text-right font-bold px-4 py-3">TOTAL</td>
                            <td className="text-right font-bold text-lg px-4 py-3">₹{totalOrderValue.toFixed(2)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="flex justify-end mt-4">
                 <button onClick={handleCreatePurchaseOrder} className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 font-semibold shadow-sm text-sm">Create Purchase Order</button>
            </div>
        </div>
    )
}

const Inventory: React.FC = () => {
    const { products, setProducts, purchases, setPurchases, inventoryFilter, setInventoryFilter, suppliers, gstSettings, orderList, setOrderList } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState<string[]>([]);
    
    const [categoryFilter, setCategoryFilter] = useState('All Categories');
    const [statusFilter, setStatusFilter] = useState<StockStatusFilter>((inventoryFilter.status as StockStatusFilter) || 'all');
    const [tagFilter, setTagFilter] = useState<TagFilter>('all');
    
    const [openActionsMenu, setOpenActionsMenu] = useState<string | null>(null);
    const actionsMenuRef = useRef<HTMLDivElement>(null);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
                setOpenActionsMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const batchToPurchaseDetailsMap = useMemo(() => {
        const map = new Map<string, { supplierName: string, invoiceNumber?: string }>();
        for (const purchase of purchases) {
            const supplier = suppliers.find(s => s.id === purchase.supplierId);
            if (supplier) {
                for (const item of purchase.items) {
                    map.set(item.batchId, {
                        supplierName: supplier.name,
                        invoiceNumber: purchase.invoiceNumber,
                    });
                }
            }
        }
        return map;
    }, [purchases, suppliers]);

    const getGstRate = (hsnCode: string = '') => {
        return hsnCode.startsWith('3004')
            ? (gstSettings.general || 12)
            : hsnCode.startsWith('2106')
            ? (gstSettings.food || 18)
            : (gstSettings.subsidized || 5);
    };

    useEffect(() => {
        const validStatus = ['all', 'low_stock', 'out_of_stock'].includes(inventoryFilter.status) ? inventoryFilter.status : 'all';
        setStatusFilter(validStatus as StockStatusFilter);
    }, [inventoryFilter.status]);

    const handleStatusFilterChange = (newStatus: StockStatusFilter) => {
        setStatusFilter(newStatus);
        setInventoryFilter({ status: newStatus as InventoryFilterStatus });
    };

    const toggleRow = (productId: string) => {
        setExpandedRows(prev => 
            prev.includes(productId) 
                ? prev.filter(id => id !== productId) 
                : [...prev, productId]
        );
    };
    
    const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, productId: string) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleRow(productId);
        }
    };

    const { lowStockCount, outOfStockCount, totalValue } = useMemo(() => {
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let totalValue = 0;

        products.forEach(p => {
            const totalStock = p.batches.reduce((sum, b) => sum + b.stock, 0);
            if (totalStock === 0) {
                outOfStockCount++;
            } else if (totalStock < (p.minStock || 20)) {
                lowStockCount++;
            }
            totalValue += p.batches.reduce((sum, b) => sum + (b.stock * b.price), 0);
        });

        return { lowStockCount, outOfStockCount, totalValue };
    }, [products]);

    const allCategories = useMemo(() => ['All Categories', ...Array.from(new Set(products.map(p => p.category || 'Uncategorized')))], [products]);

    const filteredProducts = useMemo(() => {
        return products
            .map(product => ({
                ...product,
                totalStock: product.batches.reduce((sum, b) => sum + b.stock, 0)
            }))
            .filter(product => {
                if (statusFilter === 'low_stock' && (product.totalStock === 0 || product.totalStock >= (product.minStock || 20))) {
                    return false;
                }
                if (statusFilter === 'out_of_stock' && product.totalStock > 0) {
                    return false;
                }
                if (categoryFilter !== 'All Categories' && (product.category || 'Uncategorized') !== categoryFilter) {
                    return false;
                }
                if (tagFilter === 'ordered' && !product.isOrdered) {
                    return false;
                }
                if (tagFilter === 'order_later' && !product.orderLater) {
                    return false;
                }
                if (searchTerm) {
                    const lowerSearchTerm = searchTerm.toLowerCase();
                    const inName = product.name.toLowerCase().includes(lowerSearchTerm);
                    const inMfr = product.manufacturer.toLowerCase().includes(lowerSearchTerm);
                    const inBatch = product.batches.some(b => b.batchNumber.toLowerCase().includes(lowerSearchTerm));
                    if (!inName && !inMfr && !inBatch) {
                        return false;
                    }
                }
                return true;
            })
            .sort((a,b) => a.name.localeCompare(b.name));
    }, [products, searchTerm, categoryFilter, statusFilter, tagFilter]);

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

            if (existingProductIndex > -1) {
                const productsCopy = [...prev];
                const productToUpdate = { ...productsCopy[existingProductIndex] };
                productToUpdate.batches = [...productToUpdate.batches, newBatch];
                productToUpdate.isOrdered = false; // Mark as received
                productsCopy[existingProductIndex] = productToUpdate;
                updatedProduct = productToUpdate;
                return productsCopy;
            } else {
                updatedProduct = {
                    id: `prod_${Date.now()}`,
                    name: productData.name!,
                    hsnCode: productData.hsnCode!,
                    pack: productData.pack!,
                    manufacturer: productData.manufacturer!,
                    salts: productData.salts,
                    schedule: productData.schedule,
                    category: productData.category,
                    minStock: productData.minStock,
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
                purchaseTotal += purchaseAmount;

                const existingProductIndex = productsCopy.findIndex(p => p.name.toLowerCase() === newProd.name.toLowerCase());
                let productId;

                if (existingProductIndex > -1) {
                    const productToUpdate = { ...productsCopy[existingProductIndex] };
                    productToUpdate.batches.push(newBatch);
                    productToUpdate.isOrdered = false; // Also handle for bulk upload
                    productsCopy[existingProductIndex] = productToUpdate;
                    productId = productToUpdate.id;
                } else {
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
                total: parseFloat(purchaseTotal.toFixed(2)),
                date: new Date().toISOString(),
            };
            setPurchases(prev => [...prev, newPurchase]);
        }
    };


    const handleClearFilters = () => {
        setSearchTerm('');
        setCategoryFilter('All Categories');
        handleStatusFilterChange('all');
        setTagFilter('all');
    };
    
    const getProductStatus = (product: { totalStock: number; minStock?: number }): { text: StockStatus; color: string } => {
        const { totalStock, minStock } = product;
        if (totalStock === 0) return { text: 'Out of Stock', color: 'bg-red-100 text-red-700' };
        if (totalStock < (minStock || 20)) return { text: 'Low Stock', color: 'bg-amber-100 text-amber-700' };
        return { text: 'In Stock', color: 'bg-green-100 text-green-700' };
    };

    const scheduleColors: { [key in MedicineSchedule]: string } = {
        none: 'bg-gray-100 text-gray-700',
        H: 'bg-red-100 text-red-700',
        H1: 'bg-red-200 text-red-800 font-bold',
        narcotic: 'bg-purple-200 text-purple-800 font-bold',
        tb: 'bg-orange-200 text-orange-800 font-bold',
    };
    
    const categoryColorMap = useMemo(() => {
        const colors = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-green-100 text-green-700', 'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700'];
        const map = new Map<string, string>();
        allCategories.forEach((cat, index) => {
            if(cat !== 'All Categories') map.set(cat, colors[index % colors.length]);
        });
        return map;
    }, [allCategories]);

    const getCategoryColor = (category: string) => categoryColorMap.get(category) || 'bg-gray-100 text-gray-700';

    const handleExport = () => {
        const dataToExport = filteredProducts.flatMap(product => 
            product.batches.map(batch => ({ product, batch }))
        );

        if (dataToExport.length === 0) {
            alert("No data to export.");
            return;
        }

        const headers = [
            "Medicine Name", "Manufacturer", "Category", "Schedule",
            "Batch Number", "Expiry Date", "Stock", "Min Stock",
            "Purchase Price", "MRP", "Value", "Status"
        ];
        
        const csvContent = [
            headers.join(','),
            ...dataToExport.map(({ product, batch }) => {
                const status = getProductStatus(product);
                const value = (batch.stock * batch.price).toFixed(2);
                const rowData = [
                    `"${product.name.replace(/"/g, '""')}"`, `"${product.manufacturer.replace(/"/g, '""')}"`,
                    `"${(product.category || 'N/A').replace(/"/g, '""')}"`, `"${(product.schedule || 'none').toUpperCase()}"`,
                    `"${batch.batchNumber}"`, `"${batch.expiryDate}"`, batch.stock, product.minStock || 20,
                    batch.price.toFixed(2), batch.mrp.toFixed(2), value, `"${status.text}"`
                ];
                return rowData.join(',');
            })
        ].join('\n');


        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            const date = new Date().toISOString().split('T')[0];
            link.setAttribute("href", url);
            link.setAttribute("download", `inventory_report_${date}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };
    
    const handleMarkOrderLater = (productId: string) => {
        setProducts(products.map(p => p.id === productId ? { ...p, orderLater: !p.orderLater } : p));
        setOpenActionsMenu(null);
    };

    const handleAddToOrder = (product: Product) => {
        const productPurchases = purchases.filter(p => p.items.some(item => item.productId === product.id));
        let bestSupplierId = '';
        let bestRate = Infinity;
        let bestMrp = 0;

        if (productPurchases.length > 0) {
            productPurchases.forEach(p => {
                p.items.forEach(item => {
                    if (item.productId === product.id && item.price < bestRate) {
                        bestRate = item.price;
                        bestSupplierId = p.supplierId;
                        bestMrp = product.batches.find(b => b.id === item.batchId)?.mrp || 0;
                    }
                })
            });
        } else {
            const supplierWithBestDiscount = suppliers.sort((a, b) => b.defaultDiscount - a.defaultDiscount)[0];
            if (supplierWithBestDiscount) {
                bestSupplierId = supplierWithBestDiscount.id;
            }
        }
        
        if (!bestSupplierId && suppliers.length > 0) {
             bestSupplierId = suppliers[0].id;
        }

        const typicalBatch = product.batches.find(b => b.stock > 0);
        if (bestRate === Infinity) bestRate = typicalBatch ? typicalBatch.price : 0;
        if (bestMrp === 0) bestMrp = typicalBatch ? typicalBatch.mrp : 0;

        setOrderList(prev => {
            if (prev.some(item => item.productId === product.id)) return prev;
            const newOrderItem: OrderListItem = {
                productId: product.id,
                productName: product.name,
                manufacturer: product.manufacturer,
                pack: product.pack,
                selectedSupplierId: bestSupplierId,
                quantity: 1,
                rate: bestRate,
                mrp: bestMrp
            };
            return [...prev, newOrderItem];
        });
        setOpenActionsMenu(null);
    };
    
    const handleUpdateProduct = (updatedProduct: Product) => {
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        setProductToEdit(null);
    };

    const handleDeleteProduct = (productId: string) => {
        setProducts(prev => prev.filter(p => p.id !== productId));
        setProductToDelete(null);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-secondary/50 min-h-full">
            <div>
                <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
                    <p className="text-[var(--foreground)]/70 mt-1">Monitor stock levels and manage inventory</p></div>
                    <div className="flex items-center space-x-2">
                        <button onClick={handleExport} className="flex items-center px-3 py-2 border border-border rounded-lg bg-secondary hover:bg-border/50 font-semibold text-sm">
                            <ExportIcon className="mr-2 h-4 w-4" /> Export Report
                        </button>
                        <button onClick={() => setIsBulkUploadModalOpen(true)} className="flex items-center px-3 py-2 border border-border rounded-lg bg-secondary hover:bg-border/50 font-semibold text-sm">
                            <UploadIcon className="mr-2 h-4 w-4" /> Bulk Upload
                        </button>
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold shadow-sm text-sm">
                            <PlusIcon className="mr-2 h-4 w-4" /> Add Stock
                        </button>
                    </div>
                
            </div>
            {lowStockCount > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-lg">
                    <div className="flex">
                        <div className="flex-shrink-0"><LowStockIcon className="h-5 w-5 text-amber-400"/></div>
                        <div className="ml-3"><p className="text-sm text-amber-700 font-bold">Low Stock Alert: <span className="font-medium">{lowStockCount} medicines are running low on stock and need restocking.</span></p></div>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard title="Total Items" value={products.length.toString()} subtitle="Unique medicines in stock" icon={<TotalItemsIcon className="w-8 h-8 text-indigo-500" />} iconBgColor="bg-indigo-100" />
                <StatCard title="Low Stock" value={lowStockCount.toString()} subtitle="Need restocking" icon={<LowStockIcon className="w-8 h-8 text-amber-500" />} iconBgColor="bg-amber-100" />
                <StatCard title="Out of Stock" value={outOfStockCount.toString()} subtitle="Completely depleted" icon={<OutOfStockIcon className="w-8 h-8 text-red-500" />} iconBgColor="bg-red-100" />
                <StatCard title="Total Value" value={`₹${totalValue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} subtitle="Current inventory value" icon={<TotalValueIcon className="w-8 h-8 text-green-500" />} iconBgColor="bg-green-100" />
            </div>

            <div className="bg-card rounded-xl border border-border p-5 mb-6">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-grow" style={{flexBasis: '300px'}}><label className="text-sm font-semibold text-muted-foreground mb-1 block">Search</label><input type="text" placeholder="Medicine name, manufacturer, batch..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2.5 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring"/></div>
                    <div className="flex-grow" style={{flexBasis: '200px'}}><label className="text-sm font-semibold text-muted-foreground mb-1 block">Category</label><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full p-2.5 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring"><option disabled>Select Category</option>{allCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div className="flex-grow" style={{flexBasis: '200px'}}><label className="text-sm font-semibold text-muted-foreground mb-1 block">Stock Status</label><select value={statusFilter} onChange={e => handleStatusFilterChange(e.target.value as StockStatusFilter)} className="w-full p-2.5 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring"><option value="all">All Items</option><option value="low_stock">Low Stock</option><option value="out_of_stock">Out of Stock</option></select></div>
                    <div className="flex-grow" style={{flexBasis: '200px'}}>
                        <label className="text-sm font-semibold text-muted-foreground mb-1 block">Tags</label>
                        <select value={tagFilter} onChange={e => setTagFilter(e.target.value as TagFilter)} className="w-full p-2.5 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring">
                            <option value="all">All Tags</option>
                            <option value="ordered">Ordered</option>
                            <option value="order_later">Order Later</option>
                        </select>
                    </div>
                    <button onClick={handleClearFilters} className="px-4 py-2.5 border border-border rounded-lg bg-secondary hover:bg-border/50 font-semibold text-sm">Clear Filters</button>
                    <div className="flex-grow text-right text-sm text-muted-foreground" style={{flexBasis: '100px'}}>Showing {filteredProducts.length} items</div>
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border">
                <div className="p-4 sm:p-5 border-b border-border flex flex-wrap gap-3 justify-between items-center">
                    <h2 className="text-xl font-bold text-foreground">Inventory Items</h2>
                    
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-foreground min-w-[1000px]">
                        <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                            <tr>
                                <th scope="col" className="px-2 py-3 w-12"></th>
                                <th scope="col" className="px-4 py-3 font-semibold">Medicine</th>
                                <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                                <th scope="col" className="px-4 py-3 font-semibold">Total Stock</th>
                                <th scope="col" className="px-4 py-3 font-semibold">Total Value</th>
                                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                                <th scope="col" className="px-4 py-3 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                        {filteredProducts.map(product => {
                            const status = getProductStatus(product);
                            const schedule = product.schedule || 'none';
                            const category = product.category || 'Uncategorized';
                            const totalValue = product.batches.reduce((sum, b) => sum + (b.stock * b.mrp), 0);
                            const isExpanded = expandedRows.includes(product.id);
                            
                            return (
                                <React.Fragment key={product.id}>
                                    <tr 
                                        className="border-t border-border hover:bg-secondary/30 cursor-pointer" 
                                        onClick={() => toggleRow(product.id)}
                                        onKeyDown={(e) => handleRowKeyDown(e, product.id)}
                                        tabIndex={0}
                                        aria-expanded={isExpanded}
                                        aria-controls={`batches-${product.id}`}
                                    >
                                        <td className="px-2 py-3 text-center">
                                            <button className="p-1 rounded-full hover:bg-border" aria-label={`Show batches for ${product.name}`}>
                                                <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}/>
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span>{product.name}</span>
                                                {product.orderLater && <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-700">Order Later</span>}
                                                {product.isOrdered && <span className="px-2 py-0.5 text-xs font-bold rounded bg-purple-100 text-purple-700">Ordered</span>}
                                                {schedule !== 'none' && <span className={`px-2 py-0.5 text-xs font-bold rounded ${scheduleColors[schedule]}`}>{`Sch ${schedule.toUpperCase()}`}</span>}
                                            </div>
                                            <p className="text-xs text-muted-foreground">{product.manufacturer}</p>
                                        </td>
                                        <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(category)}`}>{category}</span></td>
                                        <td className="px-4 py-3"><p className="font-bold text-base">{product.totalStock}</p><p className="text-xs text-muted-foreground">Min: {product.minStock || 20}</p></td>
                                        <td className="px-4 py-3 font-semibold">₹{totalValue.toFixed(2)}</td>
                                        <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-bold rounded-full ${status.color}`}>{status.text}</span></td>
                                        <td className="px-4 py-3 relative">
                                            <button onClick={(e) => { e.stopPropagation(); setOpenActionsMenu(product.id === openActionsMenu ? null : product.id); }} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-border">
                                                <ActionsIcon />
                                            </button>
                                            {openActionsMenu === product.id && (
                                                <div ref={actionsMenuRef} className="absolute right-4 mt-2 w-48 bg-card border border-border rounded-lg shadow-xl z-20">
                                                    <ul className="py-1">
                                                        <li><button onClick={(e) => { e.stopPropagation(); handleAddToOrder(product); }} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary">Add to Order List</button></li>
                                                        <li><button onClick={(e) => { e.stopPropagation(); handleMarkOrderLater(product.id); }} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary">Mark to Order Later</button></li>
                                                        <li><button onClick={(e) => { e.stopPropagation(); setProductToEdit(product); setOpenActionsMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary">Edit</button></li>
                                                        <li><button onClick={(e) => { e.stopPropagation(); setProductToDelete(product); setOpenActionsMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary">Delete</button></li>
                                                    </ul>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr id={`batches-${product.id}`} className="bg-secondary/40">
                                            <td colSpan={7} className="p-0">
                                                {product.batches.length > 0 ? (
                                                    <div className="p-3">
                                                        <table className="w-full text-xs">
                                                            <thead className="text-muted-foreground bg-secondary">
                                                                <tr>
                                                                    <th className="px-3 py-2 font-semibold text-left w-1/4">Batch / Supplier / Invoice</th>
                                                                    <th className="px-3 py-2 font-semibold text-left w-1/6">Expiry</th>
                                                                    <th className="px-3 py-2 font-semibold text-left w-1/6">Stock</th>
                                                                    <th className="px-10 py-2 font-semibold text-left w-1/4">MRP / Rate</th>
                                                                    <th className="px-3 py-2 font-semibold text-left w-1/6">Discount / GST</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {product.batches.map(batch => {
                                                                    const purchaseDetails = batchToPurchaseDetailsMap.get(batch.id);
                                                                    const gstRate = getGstRate(product.hsnCode);
                                                                    return (
                                                                    <tr key={batch.id} className="border-t border-border/50">
                                                                        <td className="px-3 py-2 align-top">
                                                                            <p className="font-semibold text-sm">{batch.batchNumber}</p>
                                                                            <p className="text-xs text-muted-foreground">{purchaseDetails?.supplierName || 'N/A'}</p>
                                                                            <p className="text-xs text-muted-foreground">Inv: {purchaseDetails?.invoiceNumber || 'N/A'}</p>
                                                                        </td>
                                                                        <td className="px-3 py-2 text-red-600 text-sm align-center">
                                                                            {new Date(batch.expiryDate+'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-sm font-bold align-center">{batch.stock}</td>
                                                                        <td className="px-5 py-2 text-sm align-center">
                                                                            ₹{batch.mrp.toFixed(2)} / <span className="text-muted-foreground">₹{batch.price.toFixed(2)}</span>
                                                                        </td>
                                                                        <td className="px-7 py-2 text-sm align-center">
                                                                            {batch.discount}% / <span className="text-muted-foreground">{gstRate}%</span>
                                                                        </td>
                                                                    </tr>
                                                                )})}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 text-center text-muted-foreground">
                                                        No batches available for this product.
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        </tbody>
                    </table>
                    {filteredProducts.length === 0 && <p className="text-center py-8 text-muted-foreground">No products found matching your filters.</p>}
                </div>
            </div>

            <PurchaseOrderList />

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
            <EditProductModal
                product={productToEdit}
                onClose={() => setProductToEdit(null)}
                onSave={handleUpdateProduct}
            />
            <DeleteConfirmationModal
                product={productToDelete}
                onClose={() => setProductToDelete(null)}
                onConfirm={handleDeleteProduct}
            />
        </div>
    );
};

export default Inventory;