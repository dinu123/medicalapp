import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { ChevronDownIcon, PlusIcon } from './Icons';
import { PurchaseOrder, OrderListItem } from '../types';
import { searchProducts as searchProductsAPI } from '../services/productService';
import { getPurchaseOrders, createPurchaseOrder } from '../services/purchaseOrderService';

const CreatePOModal: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (po: Omit<PurchaseOrder, 'id' | 'createdDate'>) => void }> = ({ isOpen, onClose, onSubmit }) => {
    const { suppliers } = useContext(AppContext);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [selectedItems, setSelectedItems] = useState<{productId: string; productName: string; manufacturer: string; quantity: number; rate: number}[]>([]);
    const [newItem, setNewItem] = useState({productId: '', productName: '', quantity: 1, rate: 0});
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [showProductDropdown, setShowProductDropdown] = useState(false);

    useEffect(() => {
        const searchProducts = async () => {
            if (productSearch.length >= 3) {
                try {
                    const results = await searchProductsAPI(productSearch);
                    setProductResults(results);
                    setShowProductDropdown(true);
                } catch (error) {
                    console.error('Product search failed:', error);
                    setProductResults([]);
                }
            } else {
                setProductResults([]);
                setShowProductDropdown(false);
            }
        };
        
        const timeoutId = setTimeout(searchProducts, 300);
        return () => clearTimeout(timeoutId);
    }, [productSearch]);

    const selectProduct = (product: any) => {
        setNewItem(prev => ({
            ...prev,
            productId: product._id || product.id,
            productName: product.name
        }));
        setProductSearch(product.name);
        setShowProductDropdown(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSupplier || selectedItems.length === 0) return;

        const totalValue = selectedItems.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
        
        onSubmit({
            supplierId: selectedSupplier,
            items: selectedItems,
            totalValue,
            status: 'pending'
        });
        
        setSelectedSupplier('');
        setSelectedItems([]);
        setNewItem({productId: '', productName: '', quantity: 1, rate: 0});
        setProductSearch('');
        onClose();
    };

    const addItem = () => {
        if (!newItem.productId || !newItem.productName || newItem.quantity <= 0 || newItem.rate <= 0) return;
        
        const item = {
            productId: newItem.productId,
            productName: newItem.productName,
            manufacturer: '',
            quantity: newItem.quantity,
            rate: newItem.rate
        };
        
        setSelectedItems(prev => [...prev, item]);
        setNewItem({productId: '', productName: '', quantity: 1, rate: 0});
        setProductSearch('');
    };

    const removeItem = (productId: string) => {
        setSelectedItems(prev => prev.filter(item => item.productId !== productId));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl border border-border w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-xl font-bold mb-4">Create Purchase Order</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Supplier</label>
                            <select 
                                value={selectedSupplier} 
                                onChange={(e) => setSelectedSupplier(e.target.value)}
                                className="w-full p-3 border border-border rounded-lg bg-input"
                                required
                            >
                                <option value="">Select Supplier</option>
                                {suppliers.map(supplier => (
                                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Add Items</label>
                            <div className="flex gap-2 mb-3">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        placeholder="Search product..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        className="w-full p-2 border border-border rounded-lg bg-input text-sm"
                                    />
                                    {showProductDropdown && productResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                                            {productResults.map(product => (
                                                <button
                                                    key={product._id || product.id}
                                                    type="button"
                                                    onClick={() => selectProduct(product)}
                                                    className="w-full text-left p-2 hover:bg-secondary text-sm border-b border-border last:border-b-0"
                                                >
                                                    <div className="font-semibold">{product.name}</div>
                                                    <div className="text-xs text-muted-foreground">{product.manufacturer}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    placeholder="Qty"
                                    value={newItem.quantity}
                                    onChange={(e) => setNewItem(prev => ({...prev, quantity: parseInt(e.target.value) || 1}))}
                                    className="w-20 p-2 border border-border rounded-lg bg-input text-sm"
                                    min="1"
                                />
                                <input
                                    type="number"
                                    placeholder="Rate"
                                    value={newItem.rate}
                                    onChange={(e) => setNewItem(prev => ({...prev, rate: parseFloat(e.target.value) || 0}))}
                                    className="w-24 p-2 border border-border rounded-lg bg-input text-sm"
                                    min="0"
                                    step="0.01"
                                />
                                <button type="button" onClick={addItem} className="px-3 py-2 bg-secondary text-foreground rounded-lg text-sm">Add</button>
                            </div>
                            
                            {selectedItems.length > 0 && (
                                <div className="border border-border rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="bg-secondary/50">
                                            <tr>
                                                <th className="p-2 text-left">Product</th>
                                                <th className="p-2 text-center">Qty</th>
                                                <th className="p-2 text-right">Rate</th>
                                                <th className="p-2 text-right">Amount</th>
                                                <th className="p-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedItems.map(item => (
                                                <tr key={item.productId} className="border-t border-border">
                                                    <td className="p-2">{item.productName}</td>
                                                    <td className="p-2 text-center">{item.quantity}</td>
                                                    <td className="p-2 text-right">₹{item.rate}</td>
                                                    <td className="p-2 text-right">₹{(item.quantity * item.rate).toFixed(2)}</td>
                                                    <td className="p-2">
                                                        <button type="button" onClick={() => removeItem(item.productId)} className="text-red-500 text-xs">Remove</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-3 justify-end">
                            <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-lg">Cancel</button>
                            <button type="submit" disabled={!selectedSupplier || selectedItems.length === 0} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50">Create PO</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const PurchaseOrders: React.FC = () => {
    const { suppliers } = useContext(AppContext);
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [expandedRows, setExpandedRows] = useState<string[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPurchaseOrders = async () => {
            try {
                const orders = await getPurchaseOrders();
                setPurchaseOrders(orders);
            } catch (error) {
                console.error('Failed to fetch purchase orders:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchPurchaseOrders();
    }, []);

    const handleCreatePurchaseOrder = async (poData: Omit<PurchaseOrder, 'id' | 'createdDate'>) => {
        try {
            const newPO = await createPurchaseOrder(poData);
            setPurchaseOrders(prev => [newPO, ...prev]);
        } catch (error) {
            console.error('Failed to create purchase order:', error);
        }
    };

    const toggleRow = (poId: string) => {
        setExpandedRows(prev =>
            prev.includes(poId)
                ? prev.filter(id => id !== poId)
                : [...prev, poId]
        );
    };

    if (loading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    const sortedPOs = [...purchaseOrders].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-foreground">Purchase Orders</h1>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                    <PlusIcon className="w-4 h-4" />
                    Create Purchase Order
                </button>
            </div>

            <CreatePOModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onSubmit={handleCreatePurchaseOrder}
            />

            <div className="bg-card rounded-xl border border-border">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-foreground min-w-[800px]">
                        <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                            <tr>
                                <th scope="col" className="px-2 py-3 w-12"></th>
                                <th scope="col" className="px-4 py-3 font-semibold">PO ID</th>
                                <th scope="col" className="px-4 py-3 font-semibold">Supplier</th>
                                <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-center">Items</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-right">Total Value</th>
                                <th scope="col" className="px-4 py-3 font-semibold text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchaseOrders.map(po => {
                                const supplier = suppliers.find(s => s.id === po.supplierId);
                                const isExpanded = expandedRows.includes(po._id);
                                return (
                                    <React.Fragment key={po._id}>
                                        <tr
                                            className="border-t border-border hover:bg-secondary/30 cursor-pointer"
                                            onClick={() => toggleRow(po._id)}
                                            tabIndex={0}
                                            aria-expanded={isExpanded}
                                        >
                                            <td className="px-2 py-3 text-center">
                                                <button className="p-1 rounded-full hover:bg-border" aria-label={`Show items for PO ${po._id}`}>
                                                    <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">PO-{po._id.slice(-6)}</td>
                                            <td className="px-4 py-3 font-semibold">{supplier?.name || 'N/A'}</td>
                                            <td className="px-4 py-3">{new Date(po.createdAt).toLocaleDateString('en-GB')}</td>
                                            <td className="px-4 py-3 text-center">{po.items.length}</td>
                                            <td className="px-4 py-3 text-right font-bold">₹{po.totalValue.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700 capitalize">{po.status}</span>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-secondary/40">
                                                <td colSpan={7} className="p-3">
                                                    <div className="p-2 bg-card rounded-md border border-border">
                                                        <h4 className="font-bold mb-2 px-2">Items in PO-{po._id.slice(-6)}</h4>
                                                        <table className="w-full text-xs">
                                                            <thead className="text-muted-foreground">
                                                                <tr>
                                                                    <th className="px-3 py-2 font-semibold text-left">Product</th>
                                                                    <th className="px-3 py-2 font-semibold text-center">Qty</th>
                                                                    <th className="px-3 py-2 font-semibold text-right">Rate</th>
                                                                    <th className="px-3 py-2 font-semibold text-right">Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {po.items.map((item: any, index: number) => (
                                                                    <tr key={index} className="border-t border-border/50">
                                                                        <td className="px-3 py-2">
                                                                            <p className="font-semibold">{item.productName}</p>
                                                                            <p className="text-muted-foreground">{item.manufacturer}</p>
                                                                        </td>
                                                                        <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                                                                        <td className="px-3 py-2 text-right">₹{item.rate.toFixed(2)}</td>
                                                                        <td className="px-3 py-2 text-right">₹{(item.rate * item.quantity).toFixed(2)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                    {purchaseOrders.length === 0 && (
                        <p className="text-center py-12 text-muted-foreground">No purchase orders have been created yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrders;