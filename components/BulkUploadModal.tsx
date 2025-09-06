import React, { useState, useCallback, useContext } from 'react';
import { AppContext } from '../App';
import { Product, PurchaseStatus, Supplier } from '../types';
import { parseInventoryFile } from '../services/geminiService';
import { XIcon, UploadIcon } from './Icons';
import { SupplierModal } from './SupplierModal';

interface BulkUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (products: any[], purchaseStatus: PurchaseStatus, supplierId: string) => void;
    suppliers: Supplier[];
}

type InstructionTab = 'csv' | 'image' | 'pdf';

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onSave, suppliers }) => {
    const { setSuppliers } = useContext(AppContext);
    const [file, setFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [parsedProducts, setParsedProducts] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<InstructionTab>('csv');
    const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>('paid');
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);


    const resetState = useCallback(() => {
        setFile(null);
        if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
        }
        setImagePreviewUrl(null);
        setIsLoading(false);
        setError('');
        setParsedProducts([]);
        setActiveTab('csv');
        setPurchaseStatus('paid');
        setSelectedSupplierId('');
    }, [imagePreviewUrl]);

    const handleClose = () => {
        resetState();
        onClose();
    };
    
    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        
        setFile(selectedFile);
        setImagePreviewUrl(selectedFile.type.startsWith('image/') ? URL.createObjectURL(selectedFile) : null);
        setError('');
        setParsedProducts([]);
        setIsLoading(true);

        try {
            const { products } = await parseInventoryFile(selectedFile);
            if (products.length === 0) {
                setError("Could not find any valid product data in the file. Please check the file's content and format.");
            } else {
                setParsedProducts(products);
            }
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'add_new') {
            setIsSupplierModalOpen(true);
        } else {
            setSelectedSupplierId(value);
            setError(''); // clear supplier error if one was selected
        }
    };

    const handleSaveNewSupplier = (newSupplier: Supplier) => {
        setSuppliers(prev => {
            // Avoid duplicates
            if (prev.some(s => s.id === newSupplier.id)) {
                return prev.map(s => s.id === newSupplier.id ? newSupplier : s);
            }
            return [...prev, newSupplier];
        });
        setSelectedSupplierId(newSupplier.id);
        setIsSupplierModalOpen(false);
    };

    const handleConfirmUpload = () => {
        if (!selectedSupplierId) {
            setError('Please select a supplier.');
            return;
        }
        onSave(parsedProducts, purchaseStatus, selectedSupplierId);
        handleClose();
    };
    
    const headerDisplayNames: Record<string, string> = {
        name: 'Name', hsnCode: 'HSN', pack: 'Pack', manufacturer: 'Mfr', batchNumber: 'Batch',
        expiryDate: 'Expiry', stock: 'Qty', mrp: 'MRP', price: 'Rate', discount: 'Disc(%)', salts: 'Salts',
        tax: 'Tax(%)', amount: 'Amount'
    };
    
    const preferredHeaderOrder: string[] = [
        'name', 'hsnCode', 'pack', 'manufacturer', 'salts', 'batchNumber', 
        'expiryDate', 'stock', 'mrp', 'price', 'discount', 'tax', 'amount'
    ];
    
    const formatValue = (value: any, key: string) => {
        if (value === undefined || value === null) return '';
        if (typeof value === 'object' && value !== null) return JSON.stringify(value);
        if (typeof value === 'number') {
            if (['mrp', 'price', 'amount'].includes(key)) return `₹${value.toFixed(2)}`;
            if (['discount', 'tax'].includes(key)) return `${value}%`;
        }
        return String(value);
    };

    const instructionContent = {
        csv: ( <> <p className="font-semibold">CSV File Format</p> <p>Ensure your CSV file has a header row with columns like the following:</p> <code className="block bg-background p-2 rounded mt-2 text-sm break-all">name,batchNumber,expiryDate,stock,mrp,price,salts,schedule</code> <p className="mt-2">The <code className="text-sm">expiryDate</code> should be in <code className="text-sm">YYYY-MM-DD</code> format. The AI can understand variations of these headers.</p> </> ),
        image: ( <> <p className="font-semibold">Image (PNG, JPG) File Format</p> <p>Upload a clear, well-lit image of a table or spreadsheet containing inventory data.</p> <p className="mt-2">Ensure columns for fields like Name, Batch, Expiry, Quantity, MRP, and Rate are visible.</p> </> ),
        pdf: ( <> <p className="font-semibold">PDF File Format</p> <p>Your PDF should contain a clearly structured table with inventory data.</p> <p className="mt-2">Ensure the text is selectable for best results.</p> </> ),
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-card text-card-foreground border border-border rounded-xl p-6 w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Bulk Upload Inventory</h2>
                    <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"> <XIcon /> </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 flex-grow min-h-0">
                    <div className="flex flex-col">
                        <h3 className="text-lg font-semibold mb-2">Instructions</h3>
                         <div className="mb-4 border-b border-border">
                            <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                                {(['csv', 'image', 'pdf'] as InstructionTab[]).map(tab => (
                                    <button key={tab} onClick={() => setActiveTab(tab)} className={`${ activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border' } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm capitalize`}>
                                        {tab}
                                    </button>
                                ))}
                            </nav>
                        </div>
                        <div className="p-4 bg-secondary rounded-lg text-secondary-foreground text-sm flex-grow"> {instructionContent[activeTab]} </div>
                        <div className="mt-4">
                            <label className="text-sm font-semibold text-muted-foreground mb-1 block">Purchase Status</label>
                            <div className="flex gap-2 rounded-lg bg-input p-1.5 border border-border w-full">{ (['paid', 'credit'] as PurchaseStatus[]).map(s => (
                                <button type="button" key={s} onClick={() => setPurchaseStatus(s)} className={`px-3 py-1.5 text-sm rounded-md flex-1 capitalize ${purchaseStatus === s ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-secondary/80'}`}>{s}</button>
                            ))}</div>
                        </div>
                        <div className="mt-4">
                            <label htmlFor="supplier-select" className="text-sm font-semibold text-muted-foreground mb-1 block">Supplier</label>
                            <select
                                id="supplier-select"
                                value={selectedSupplierId}
                                onChange={handleSupplierChange}
                                required
                                className="w-full p-3 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring"
                            >
                                <option value="" disabled>Select a supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                <option value="add_new" className="font-bold text-primary">-- Add New Supplier --</option>
                            </select>
                        </div>
                        <label className="mt-4 w-full flex flex-col items-center px-4 py-6 bg-input text-primary rounded-lg shadow-sm tracking-wide uppercase border-2 border-dashed border-primary cursor-pointer hover:bg-secondary transition-colors">
                            <UploadIcon className="w-8 h-8"/>
                            <span className="mt-2 text-base leading-normal font-semibold text-center">{file ? file.name : 'Select a file'}</span>
                            <input type='file' className="hidden" onChange={handleFileChange} accept=".csv, .png, .jpg, .jpeg, .pdf" />
                        </label>
                    </div>

                    <div className="flex flex-col space-y-4 min-h-0">
                        {imagePreviewUrl && ( <div className="flex-shrink-0"> <h3 className="text-lg font-semibold mb-2">Image Preview</h3> <div className="bg-secondary rounded-lg border border-border p-2 max-h-48 overflow-auto"> <img src={imagePreviewUrl} alt="Uploaded preview" className="w-full h-auto object-contain" /> </div> </div> )}
                         <div className="flex flex-col flex-grow min-h-0">
                             <h3 className="text-lg font-semibold mb-2">Parsed Data Preview</h3>
                            <div className="flex-grow bg-secondary rounded-lg border border-border overflow-auto p-2">
                               {isLoading && <div className="text-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div><p className="mt-2 text-sm text-muted-foreground">AI is parsing your file...</p></div>}
                               {error && <div className="p-4 text-destructive font-medium bg-destructive/10 text-sm rounded-lg">{error}</div>}
                               {parsedProducts.length > 0 && (
                                   <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="text-muted-foreground sticky top-0 bg-secondary">
                                            <tr>{preferredHeaderOrder.map(headerKey => ( <th key={headerKey} className="p-2 whitespace-nowrap font-semibold">{headerDisplayNames[headerKey] || headerKey}</th> ))}</tr>
                                        </thead>
                                        <tbody className="text-foreground">
                                            {parsedProducts.map((p: any, i) => (
                                                <tr key={i} className="border-t border-border">
                                                    {preferredHeaderOrder.map(headerKey => ( <td key={`${headerKey}-${i}`} className="p-2 whitespace-nowrap">{formatValue(p[headerKey], headerKey)}</td> ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                   </div>
                               )}
                               {!isLoading && !error && parsedProducts.length === 0 && file && <p className="text-center text-sm text-muted-foreground p-4">No products found in the file.</p>}
                                {!isLoading && !file && <p className="text-center text-sm text-muted-foreground p-4">Upload a file to see the preview.</p>}
                            </div>
                         </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-auto flex-shrink-0">
                    <button type="button" onClick={handleClose} className="px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold">Cancel</button>
                    <button type="button" onClick={handleConfirmUpload} disabled={parsedProducts.length === 0 || isLoading || !selectedSupplierId} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed font-semibold shadow-md">
                        {isLoading ? 'Processing...' : `Add ${parsedProducts.length} Products`}
                    </button>
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

export default BulkUploadModal;