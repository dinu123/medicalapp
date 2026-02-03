import React, { useState, useContext, useMemo, useEffect, useRef, useCallback } from 'react';
import { AppContext } from '../App';
import { Product, CartItem, Transaction, Voucher, Batch, JournalTransaction, Customer, ParsedPrescription, ParsedPrescriptionItem, MedicineSchedule } from '../types';
import { XIcon, SearchIcon, CashIcon, CardIcon, UpiIcon, PrintIcon, CreditIcon, ChevronDownIcon, CameraIcon, CheckIcon, RedoIcon, UploadCloudIcon } from './Icons';
import { parsePrescription } from '../services/geminiService';
import { saveFile } from '../services/db';
import { createTransaction } from '../services/transactionService';
import { searchCustomers, createOrUpdateCustomer } from '../services/customerService';
import { searchProducts } from '../services/productService';

// Helper function to extract units per pack (e.g., tablets, capsules)
const getUnitsInPack = (pack: string): number => {
    // FIX: Regex now handles "tablet(s)" and "capsule(s)" in addition to "tab(s)" and "cap(s)".
    const match = pack.match(/(\d+)\s*(tab(let)?|cap(sule)?)s?/i);
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
    const { storeSettings } = useContext(AppContext);
    
    const consolidatedCartForInvoice = useMemo(() => {
        const consolidated = new Map<string, {
            product: Product;
            totalQuantity: number;
            totalValue: number;
            batches: { batch: Batch, quantity: number }[];
        }>();

        cart.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            // If product not found in products array, create a minimal product object
            const productData = product || {
                id: item.productId,
                name: item.productName,
                hsnCode: 'N/A',
                pack: '1 unit',
                manufacturer: 'N/A',
                batches: [{ id: item.batchId, batchNumber: 'N/A', stock: 1, mrp: item.price, expiryDate: new Date().toISOString() }]
            };
            const batch = productData.batches.find(b => b.id === item.batchId) || productData.batches[0];
            if (!productData || !batch) return;

            const existing = consolidated.get(item.productId);
            const unitsPerPack = getUnitsInPack(productData.pack);
            const pricePerUnit = item.price / unitsPerPack;
            const hasSaleDiscount = batch.saleDiscount && batch.saleDiscount > 0;
            const effectivePrice = hasSaleDiscount ? pricePerUnit * (1 - batch.saleDiscount! / 100) : pricePerUnit;
            const itemValue = effectivePrice * item.quantity;
            
            if (existing) {
                existing.totalQuantity += item.quantity;
                existing.totalValue += itemValue;
                existing.batches.push({ batch, quantity: item.quantity });
            } else {
                consolidated.set(item.productId, {
                    product: productData,
                    totalQuantity: item.quantity,
                    totalValue: itemValue,
                    batches: [{ batch, quantity: item.quantity }],
                });
            }
        });

        return Array.from(consolidated.values());
    }, [cart, products]);

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
                            <h1 class="text-3xl font-bold">${storeSettings.storeName}</h1>
                            <p class="text-sm text-gray-500">${storeSettings.storeAddress}</p>
                            <p class="text-sm text-gray-500">Contact: ${storeSettings.contactNumber} | GSTIN: ${storeSettings.gstin}</p>
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
                                <th class="px-4 py-2">Item / HSN / Batches</th>
                                <th class="px-4 py-2 text-center">Qty</th>
                                <th class="px-4 py-2 text-right">Rate</th>
                                <th class="px-4 py-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${consolidatedCartForInvoice.map((item, index) => {
                                const weightedAveragePrice = item.totalQuantity > 0 ? item.totalValue / item.totalQuantity : 0;
                                const batchDetails = item.batches.map(b => `${b.batch.batchNumber} (x${b.quantity})`).join(', ');
                                return `<tr class="border-b">
                                    <td class="px-4 py-2">${index + 1}</td>
                                    <td class="px-4 py-2 font-semibold">${item.product.name}<br><span class="text-xs text-gray-500 print-text-muted">HSN: ${item.product.hsnCode || 'N/A'} | Batches: ${batchDetails}</span></td>
                                    <td class="px-4 py-2 text-center">${item.totalQuantity}</td>
                                    <td class="px-4 py-2 text-right">₹${weightedAveragePrice.toFixed(2)}</td>
                                    <td class="px-4 py-2 text-right">₹${item.totalValue.toFixed(2)}</td>
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
                            <h1 className="text-2xl font-bold">{storeSettings.storeName}</h1>
                            <p className="text-sm text-muted-foreground">{storeSettings.storeAddress}</p>
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
                                    <th className="px-4 py-2 text-center">Qty</th>
                                    <th className="px-4 py-2 text-right">Rate</th>
                                    <th className="px-4 py-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {consolidatedCartForInvoice.map((item, index) => {
                                    const weightedAveragePrice = item.totalQuantity > 0 ? item.totalValue / item.totalQuantity : 0;
                                    return (
                                        <tr key={item.product.id} className="border-b border-border">
                                            <td className="px-4 py-2">{index + 1}</td>
                                            <td className="px-4 py-2 font-semibold">{item.product.name}</td>
                                            <td className="px-4 py-2 text-center">{item.totalQuantity}</td>
                                            <td className="px-4 py-2 text-right">₹{weightedAveragePrice.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right">₹{item.totalValue.toFixed(2)}</td>
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

const PrescriptionScannerModal: React.FC<{
    onClose: () => void;
    onConfirm: (data: ParsedPrescription) => void;
}> = ({ onClose, onConfirm }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [view, setView] = useState<'camera' | 'upload' | 'preview' | 'loading' | 'error'>('camera');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<ParsedPrescription | null>(null);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        stopStream();
        setError(null);
        setView('camera');

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = mediaStream;
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err: any) {
            console.error("Error accessing camera:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError("Camera access denied. Please enable camera permissions in your browser settings.");
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setError("No camera found on this device.");
            } else {
                setError("Could not access the camera. It might be in use by another application.");
            }
            setView('upload'); // Fallback to upload view
        }
    }, [stopStream]);

    useEffect(() => {
        startCamera();
        return () => {
            stopStream();
        };
    }, [startCamera, stopStream]);
    
    const analyzeImage = useCallback(async (imageFile: File) => {
        setView('loading');
        setError(null);
        setParsedData(null);
        try {
            const data = await parsePrescription(imageFile);
            setParsedData(data);
            setView('preview');
        } catch (err: any) {
            setError(err.message || "An error occurred during analysis.");
            setView('error');
        }
    }, []);

    const handleCapture = () => {
        if (videoRef.current) {
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const imageUrl = canvas.toDataURL('image/jpeg');
            setImagePreview(imageUrl);
            stopStream();
            
            fetch(imageUrl).then(res => res.blob()).then(blob => {
                 const imageFile = new File([blob], "prescription.jpg", { type: "image/jpeg" });
                 analyzeImage(imageFile);
            });
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
                analyzeImage(file);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleRetry = () => {
        setImagePreview(null);
        setParsedData(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        startCamera();
    };

    const handleConfirm = () => {
        if (parsedData) {
            onConfirm(parsedData);
        }
        onClose();
    };
    
    const handlePatientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(parsedData) setParsedData({...parsedData, patientName: e.target.value });
    };

    const handleDoctorNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
         if(parsedData) setParsedData({...parsedData, doctorName: e.target.value });
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-card text-card-foreground rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold">AI Prescription Import</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon /></button>
                </div>
                <div className="flex-grow p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
                    {/* Left Panel: Camera/Upload/Preview */}
                    <div className="bg-secondary rounded-lg flex flex-col items-center justify-center p-2 relative min-h-[300px]">
                        {view === 'camera' && (
                             <div className="w-full h-full bg-black rounded-lg overflow-hidden flex flex-col">
                                <video ref={videoRef} autoPlay playsInline className="w-full flex-grow object-contain"></video>
                                <div className="p-2 text-center">
                                    <button onClick={() => setView('upload')} className="text-sm text-primary-foreground/80 hover:underline">Or upload an image</button>
                                </div>
                            </div>
                        )}
                        {view === 'upload' && (
                            <>
                            {error && <p className="text-xs text-destructive p-2 text-center">{error}</p> }
                            <label className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-primary/5">
                                <UploadCloudIcon className="w-12 h-12 text-muted-foreground mb-2"/>
                                <span className="font-semibold text-foreground">Click to upload</span>
                                <span className="text-sm text-muted-foreground">PNG, JPG, or WEBP</span>
                                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                            {error && <button onClick={startCamera} className='text-sm text-primary font-semibold p-2'>Retry Camera Access</button>}
                            </>
                        )}
                        {(view === 'preview' || view === 'loading' || view === 'error') && imagePreview && (
                            <div className="relative w-full h-full">
                                <img src={imagePreview} alt="Prescription preview" className="w-full h-full object-contain rounded-lg" />
                                {view === 'loading' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 rounded-lg">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-foreground"></div>
                                        <p className="mt-4 text-primary-foreground font-semibold">Gemini is reading the prescription...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                     {/* Right Panel: Results/Controls */}
                    <div className="flex flex-col">
                        <h3 className="text-lg font-bold mb-2">Extracted Details</h3>
                        {view === 'loading' && <div className="text-center p-8 flex-grow"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div><p className="mt-2 text-sm text-muted-foreground">Analyzing...</p></div>}
                        {view === 'error' && (
                            <div className="flex flex-col items-center justify-center flex-grow bg-card p-4 text-center">
                                <div className="p-4 bg-destructive/10 text-destructive rounded-lg w-full">
                                    <p className="font-bold mb-2">Analysis Failed</p>
                                    <p>{error}</p>
                                </div>
                            </div>
                        )}
                        {(view === 'preview' && parsedData) && (
                            <div className="space-y-4 flex-grow">
                                <div>
                                    <label className="text-sm font-semibold text-muted-foreground mb-1 block">Patient Name</label>
                                    <input type="text" value={parsedData.patientName || ''} onChange={handlePatientNameChange} className="w-full p-2 border border-border rounded-lg bg-input" />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-muted-foreground mb-1 block">Doctor Name</label>
                                    <input type="text" value={parsedData.doctorName || ''} onChange={handleDoctorNameChange} className="w-full p-2 border border-border rounded-lg bg-input" />
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-1">Medicines</h4>
                                    <ul className="space-y-2 max-h-60 overflow-y-auto bg-background p-2 rounded-md border border-border">
                                        {parsedData.items.length > 0 ? parsedData.items.map((item, index) => (
                                            <li key={index} className="flex justify-between items-center text-sm p-1">
                                                <span className="font-semibold">{item.medicineName}</span>
                                                <span className="text-muted-foreground">{item.quantity} - {item.dosage}</span>
                                            </li>
                                        )) : <li className="text-center text-muted-foreground p-4">No medicines found.</li>}
                                    </ul>
                                </div>
                            </div>
                        )}
                        <div className="flex justify-center items-center gap-4 mt-4 pt-4 border-t border-border">
                             {view === 'camera' && <button onClick={handleCapture} className="p-4 bg-primary rounded-full text-primary-foreground shadow-lg"><CameraIcon /></button>}
                             {(view === 'preview' || view === 'error') && <button onClick={handleRetry} className="px-4 py-2 flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground font-semibold border border-border"><RedoIcon className="w-5 h-5"/> Scan/Upload New</button>}
                             {view === 'preview' && <button onClick={handleConfirm} disabled={!parsedData || parsedData.items.length === 0} className="px-4 py-2 flex items-center gap-2 rounded-lg bg-success text-white font-semibold disabled:bg-muted"><CheckIcon className="w-5 h-5"/> Confirm & Add to Cart</button>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const Sell: React.FC = () => {
    const { products, setProducts, setTransactions, cart, addToCart, updateProductQuantityInCart, removeProductFromCart, clearCart, gstSettings, vouchers, setVouchers, addJournalEntry, findOrCreateCustomer, setCart } = useContext(AppContext);
    
    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Customer Search State
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
    const [showCustomerResults, setShowCustomerResults] = useState(false);
    const [customerFocusedIndex, setCustomerFocusedIndex] = useState(-1);
    const customerSearchRef = useRef<HTMLDivElement>(null);

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
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
    const [expandedRows, setExpandedRows] = useState<string[]>([]);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // Voucher State
    const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
    const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
    
    // Prescription State
    const [prescriptions, setPrescriptions] = useState<Record<string, { file?: File, status: 'uploaded' | 'skipped' }>>({});
    const prescriptionFileInputRef = useRef<HTMLInputElement>(null);
    const [productForUploadId, setProductForUploadId] = useState<string | null>(null);

    const scheduleColors: { [key in MedicineSchedule]: string } = {
        none: 'bg-gray-100 text-gray-700',
        H: 'bg-red-100 text-red-700',
        H1: 'bg-red-200 text-red-800 font-bold',
        narcotic: 'bg-purple-200 text-purple-800 font-bold',
        tb: 'bg-orange-200 text-orange-800 font-bold',
    };

    const productsWithStock = useMemo(() => 
        products.filter(p => p.batches.some(b => b.stock > 0)), 
        [products]
    );

    useEffect(() => {
        const searchProductsAsync = async () => {
            if (searchTerm.length >= 3) {
                try {
                    const results = await searchProducts(searchTerm);
                    setSearchResults(results.slice(0, 7));
                    setShowResults(true);
                    setFocusedIndex(-1);
                } catch (error) {
                    console.error('Product search failed:', error);
                    setSearchResults([]);
                    setShowResults(false);
                }
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        };
        
        const debounceTimer = setTimeout(searchProductsAsync, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchTerm]);
    
    // Customer search effect
    useEffect(() => {
        const searchCustomersAsync = async () => {
            if (customerSearchTerm.length >= 3) {
                try {
                    const results = await searchCustomers(customerSearchTerm);
                    setCustomerSearchResults(results);
                    setShowCustomerResults(true);
                    setCustomerFocusedIndex(-1);
                } catch (error) {
                    console.error('Customer search failed:', error);
                    setCustomerSearchResults([]);
                    setShowCustomerResults(false);
                }
            } else {
                setCustomerSearchResults([]);
                setShowCustomerResults(false);
            }
        };
        
        const debounceTimer = setTimeout(searchCustomersAsync, 300);
        return () => clearTimeout(debounceTimer);
    }, [customerSearchTerm]);
    
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
            if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
                setShowCustomerResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectProduct = (product: Product) => {
        // Normalize product data - ensure it has 'id' field and batches have 'id' fields
        const normalizedProduct = {
            ...product,
            id: product.id || product._id,
            batches: product.batches.map(batch => ({
                ...batch,
                id: batch.id || batch._id
            }))
        };
        addToCart(normalizedProduct);
        setSearchTerm('');
        setShowResults(false);
    };
    
    const handleSelectCustomer = (customer: any) => {
        setCustomerName(customer.name);
        setContactNumber(customer.phoneNumber);
        setCustomerSearchTerm(customer.name);
        setShowCustomerResults(false);
    };
    
    const handleCustomerNameChange = (value: string) => {
        setCustomerName(value);
        setCustomerSearchTerm(value);
        if (value !== customerSearchTerm) {
            setContactNumber(''); // Clear phone when typing new name
        }
    };
    
    const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
        if (showCustomerResults && customerSearchResults.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCustomerFocusedIndex(prev => (prev + 1) % customerSearchResults.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCustomerFocusedIndex(prev => (prev - 1 + customerSearchResults.length) % customerSearchResults.length);
            } else if (e.key === 'Enter' && customerFocusedIndex > -1) {
                e.preventDefault();
                handleSelectCustomer(customerSearchResults[customerFocusedIndex]);
            } else if (e.key === 'Escape') {
                setShowCustomerResults(false);
            }
        }
    };
    
    const handleQuantityChange = (productId: string, pack: string, stripsStr: string, unitsStr: string) => {
        const unitsPerPack = getUnitsInPack(pack);
        const strips = parseInt(stripsStr, 10) || 0;
        const units = parseInt(unitsStr, 10) || 0;
        const totalQuantity = (strips * unitsPerPack) + units;
        
        // Update cart item quantity directly
        setCart(prevCart => 
            prevCart.map(item => 
                item.productId === productId 
                    ? { ...item, quantity: totalQuantity }
                    : item
            )
        );
    };

    const toggleRow = (productId: string) => {
        setExpandedRows(prev => 
            prev.includes(productId) 
                ? prev.filter(id => id !== productId) 
                : [...prev, productId]
        );
    };
    
    const handlePrescriptionImport = (data: ParsedPrescription) => {
        if (data.patientName) setCustomerName(data.patientName);
        if (data.doctorName) setDoctorName(data.doctorName);

        data.items.forEach(item => {
            const bestMatch = findBestProductMatch(item.medicineName);
            if (bestMatch) {
                // For simplicity, add with quantity 1 for user to adjust.
                addToCart(bestMatch);
                updateProductQuantityInCart(bestMatch.id, 1);
            } else {
                console.warn(`No match found for scanned item: ${item.medicineName}`);
            }
        });
    };
    
    const findBestProductMatch = (scannedName: string) => {
        const lowerScannedName = scannedName.toLowerCase();
        let bestMatch: Product | null = null;
        let highestScore = 0;

        productsWithStock.forEach(product => {
            const lowerProductName = product.name.toLowerCase();
            let score = 0;
            if (lowerProductName.includes(lowerScannedName)) {
                score = lowerScannedName.length / lowerProductName.length;
            } else {
                const scannedWords = new Set(lowerScannedName.split(/\s+/));
                const productWords = new Set(lowerProductName.split(/\s+/));
                const intersection = new Set([...scannedWords].filter(x => productWords.has(x)));
                score = intersection.size / productWords.size;
            }

            if (score > highestScore) {
                highestScore = score;
                bestMatch = product;
            }
        });
        
        // Require a minimum match score to avoid incorrect additions
        if (highestScore > 0.5) {
            return bestMatch;
        }
        return null;
    };


    const billSummary = useMemo(() => {
        const subTotal = cart.reduce((total, item) => {
            // Use item price directly instead of looking up product
            const effectivePrice = item.price;
            return total + effectivePrice * item.quantity;
        }, 0);

        const discountAmount = subTotal * (discount / 100);
        let totalAfterDiscount = subTotal - discountAmount;

        const voucherDiscount = appliedVoucher ? Math.min(totalAfterDiscount, appliedVoucher.balance) : 0;
        totalAfterDiscount -= voucherDiscount;

        if (isRghs) {
            return { subTotal, discountAmount, voucherDiscount, totalSgst: 0, totalCgst: 0, grandTotal: totalAfterDiscount, taxBreakdown: {}, taxableValue: totalAfterDiscount };
        }

        const taxBreakdown: { [rate: number]: { sgst: number; cgst: number } } = {};
        let totalSgst = 0;
        let totalCgst = 0;

        cart.forEach(item => {
            const effectivePrice = item.price;
            const itemSubTotal = effectivePrice * item.quantity;
            
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

        return { subTotal, discountAmount, voucherDiscount, totalSgst, totalCgst, grandTotal, taxBreakdown, taxableValue: totalAfterDiscount };
    }, [cart, discount, isRghs, appliedVoucher]);
    
    const consolidatedCart = useMemo(() => {
        console.log('Raw cart:', cart);
        const consolidated = new Map<string, {
            product: Product;
            totalQuantity: number;
            totalValue: number;
            tax: number;
            batches: { batch: Batch, quantity: number }[];
        }>();

        cart.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            // If product not found in products array, create a minimal product object
            const productData = product || {
                id: item.productId,
                name: item.productName,
                pack: '1 unit', // default
                batches: [{ id: item.batchId, batchNumber: 'N/A', stock: 1, mrp: item.price }]
            };
            const batch = productData.batches.find(b => b.id === item.batchId) || productData.batches[0];
            if (!productData || !batch) return;

            const existing = consolidated.get(item.productId);
            const unitsPerPack = getUnitsInPack(productData.pack);
            const pricePerUnit = item.price / unitsPerPack;
            const hasSaleDiscount = batch.saleDiscount && batch.saleDiscount > 0;
            const effectivePrice = hasSaleDiscount ? pricePerUnit * (1 - batch.saleDiscount! / 100) : pricePerUnit;
            const itemValue = effectivePrice * item.quantity;
            
            if (existing) {
                existing.totalQuantity += item.quantity;
                existing.totalValue += itemValue;
                existing.batches.push({ batch, quantity: item.quantity });
            } else {
                consolidated.set(item.productId, {
                    product: productData,
                    totalQuantity: item.quantity,
                    totalValue: itemValue,
                    tax: item.tax,
                    batches: [{ batch, quantity: item.quantity }],
                });
            }
        });

        return Array.from(consolidated.values());
    }, [cart, products]);

    const scheduleItemsInCart = useMemo(() => {
        return consolidatedCart.filter(item => item.product.schedule && item.product.schedule !== 'none' && item.totalQuantity > 0);
    }, [consolidatedCart]);

    const isCheckoutDisabled = useMemo(() => {
        if (consolidatedCart.length === 0 || consolidatedCart.every(item => item.totalQuantity === 0)) return true;
        return scheduleItemsInCart.some(item => !prescriptions[item.product.id]);
    }, [scheduleItemsInCart, prescriptions, consolidatedCart]);


    const handleCheckout = async () => {
        const itemsToBill = cart.filter(item => item.quantity > 0);
        if (itemsToBill.length === 0) {
            alert("Cart is empty.");
            return;
        }

        if (paymentMethod === 'Credit' && (!customerName.trim() || !contactNumber.trim())) {
            const errors: { [key: string]: string } = {};
            if (!customerName.trim()) errors.customerName = 'Customer Name is required for credit sales.';
            if (!contactNumber.trim()) errors.contactNumber = 'Contact Number is required for credit sales.';
            setValidationErrors(errors);
            return;
        }
        setValidationErrors({});

        let customer;
        if (customerName.trim() && contactNumber.trim()) {
            try {
                // Create or update customer in backend
                customer = await createOrUpdateCustomer({
                    name: customerName.trim(),
                    phoneNumber: contactNumber.trim()
                });
            } catch (error) {
                console.error('Failed to create/update customer:', error);
                alert('Failed to save customer information. Please try again.');
                return;
            }
        } else {
            // Use local customer creation for walk-in customers
            customer = findOrCreateCustomer(customerName, contactNumber);
        }

        const newTransaction: Transaction = {
            id: `trans_${Date.now()}`,
            customerId: customer.customerId || customer.id,
            customerName: customer.name, doctorName, doctorRegNo, isRghs,
            items: itemsToBill,
            total: billSummary.grandTotal, date: new Date().toISOString(),
            discountPercentage: discount,
            status: paymentMethod === 'Credit' ? 'credit' : 'paid',
            paymentMethod: paymentMethod === 'Credit' ? undefined : paymentMethod,
        };
        
        try {
            // Create transaction in backend
            const backendTransaction = await createTransaction({
                customerId: customer.customerId || customer.id,
                customerName: customer.name,
                doctorName,
                doctorRegNo,
                isRghs,
                items: itemsToBill,
                total: billSummary.grandTotal,
                discountPercentage: discount,
                status: paymentMethod === 'Credit' ? 'credit' : 'paid',
                paymentMethod: paymentMethod === 'Credit' ? undefined : paymentMethod,
            });
            
            console.log('Transaction created in backend:', backendTransaction);
            // Use backend transaction ID
            newTransaction.id = backendTransaction._id || backendTransaction.id;
        } catch (error) {
            console.error('Failed to create transaction in backend:', error);
            alert('Failed to save transaction. Please try again.');
            return;
        }
        
        const attachedPrescriptions: { [productId: string]: string } = {};
        for (const [productId, p] of Object.entries(prescriptions)) {
            if (p.status === 'uploaded' && p.file) {
                const key = `${newTransaction.id}_${productId}`;
                await saveFile(key, p.file);
                attachedPrescriptions[productId] = key;
            }
        }

        if (Object.keys(attachedPrescriptions).length > 0) {
            newTransaction.attachedPrescriptions = attachedPrescriptions;
        }

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
        
        const transactions: JournalTransaction[] = [
            { accountId: 'AC-SALES', accountName: 'Sales', type: 'credit', amount: billSummary.taxableValue },
            { accountId: 'AC-SGST-OUTPUT', accountName: 'SGST Output', type: 'credit', amount: billSummary.totalSgst },
            { accountId: 'AC-CGST-OUTPUT', accountName: 'CGST Output', type: 'credit', amount: billSummary.totalCgst },
        ];

        if (newTransaction.status === 'credit') {
            transactions.unshift({ accountId: customer.id, accountName: customer.name, type: 'debit', amount: billSummary.grandTotal });
        } else {
             const paymentAccount = newTransaction.paymentMethod === 'Cash' ? 'AC-CASH' : 'AC-BANK';
             const paymentAccountName = newTransaction.paymentMethod === 'Cash' ? 'Cash' : 'Bank';
             transactions.unshift({ accountId: paymentAccount, accountName: paymentAccountName, type: 'debit', amount: billSummary.grandTotal });
        }

        addJournalEntry({
            date: newTransaction.date,
            referenceId: newTransaction.id,
            referenceType: 'Sale',
            narration: `Sale to ${customer.name}`,
            transactions: transactions as [JournalTransaction, JournalTransaction, ...JournalTransaction[]],
        });
        
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
        setPrescriptions({});
    };

    const handleUploadClick = (productId: string) => {
        setProductForUploadId(productId);
        prescriptionFileInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && productForUploadId) {
            setPrescriptions(prev => ({
                ...prev,
                [productForUploadId]: { file, status: 'uploaded' }
            }));
        }
        setProductForUploadId(null);
        if (e.target) e.target.value = ''; // Allow re-uploading the same file
    };

    const handleSkipPrescription = (productId: string) => {
        setPrescriptions(prev => ({
            ...prev,
            [productId]: { status: 'skipped' }
        }));
    };
    
    const handleResetPrescription = (productId: string) => {
        setPrescriptions(prev => {
            const newState = { ...prev };
            delete newState[productId];
            return newState;
        });
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
                    <div ref={customerSearchRef} className="relative">
                        <input 
                            type="text" 
                            placeholder="Customer Name (min 3 chars for search)" 
                            value={customerName} 
                            onChange={e => handleCustomerNameChange(e.target.value)} 
                            onKeyDown={handleCustomerKeyDown}
                            className={`w-full p-3 border rounded-lg bg-input text-foreground ${validationErrors.customerName ? 'border-destructive' : 'border-border'}`} 
                        />
                        {validationErrors.customerName && <p className="text-destructive text-xs mt-1">{validationErrors.customerName}</p>}
                        {showCustomerResults && customerSearchResults.length > 0 && (
                            <ul className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                                {customerSearchResults.map((customer, index) => (
                                    <li 
                                        key={customer._id} 
                                        onClick={() => handleSelectCustomer(customer)} 
                                        onMouseEnter={() => setCustomerFocusedIndex(index)}
                                        className={`p-3 cursor-pointer border-b border-border last:border-b-0 ${customerFocusedIndex === index ? 'bg-secondary' : 'hover:bg-secondary/50'}`}
                                    >
                                        <p className="font-semibold">{customer.name}</p>
                                        <p className="text-sm text-muted-foreground">{customer.phoneNumber}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                     <div>
                        <input type="text" placeholder="Contact Number" value={contactNumber} onChange={e => { setContactNumber(e.target.value); if(validationErrors.contactNumber) setValidationErrors(p => ({...p, contactNumber: ''}))}} className={`w-full p-3 border rounded-lg bg-input text-foreground ${validationErrors.contactNumber ? 'border-destructive' : 'border-border'}`} />
                        {validationErrors.contactNumber && <p className="text-destructive text-xs mt-1">{validationErrors.contactNumber}</p>}
                    </div>
                    <input type="text" placeholder="Doctor Name (Optional)" value={doctorName} onChange={e => setDoctorName(e.target.value)} className="w-full p-3 border border-border rounded-lg bg-input" />
                    <input type="text" placeholder="Doctor Reg. No. (Optional)" value={doctorRegNo} onChange={e => setDoctorRegNo(e.target.value)} className="w-full p-3 border border-border rounded-lg bg-input" />
                </div>
                 <div className="flex items-center gap-2 mb-4">
                    <input type="checkbox" id="rghs-checkbox" checked={isRghs} onChange={e => setIsRghs(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                    <label htmlFor="rghs-checkbox" className="text-sm font-medium text-foreground">Items sold on RGHS portal (GST Exempt)</label>
                </div>
                 <div ref={searchRef} className="relative mb-4 flex gap-2">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input type="text" placeholder="Search for products (min 3 chars)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={handleKeyDown} className="w-full p-3 pl-10 border border-border rounded-lg bg-input" />
                    </div>
                    <button onClick={() => setIsScannerOpen(true)} className="p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold shadow-sm flex items-center gap-2">
                        <CameraIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">Scan / Upload Rx</span>
                    </button>
                    {showResults && (
                        <ul className="absolute top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                            {searchResults.length > 0 ? searchResults.map((p, index) => (
                                <li key={p._id || p.id} onClick={() => handleSelectProduct(p)} onMouseEnter={() => setFocusedIndex(index)} className={`p-3 cursor-pointer ${focusedIndex === index ? 'bg-secondary' : 'hover:bg-secondary/50'}`}>
                                    <p className="font-semibold">{p.name}</p>
                                    <p className="text-sm text-muted-foreground">Stock: {p.batches.reduce((s, b) => s + b.stock, 0)} | MRP: ₹{p.batches.find(b=>b.stock > 0)?.mrp.toFixed(2)}</p>
                                </li>
                            )) : <li className="p-3 text-center text-muted-foreground">No products found.</li>}
                        </ul>
                    )}
                </div>

                <div className="bg-card rounded-lg border border-border flex-grow overflow-y-auto">
                     <div className="p-2 text-xs text-muted-foreground">Cart items: {cart.length} | Consolidated: {consolidatedCart.length}</div>
                     <table className="w-full text-sm">
                        <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0 border-b border-border"><tr><th className="px-4 py-3 text-left font-semibold">Product</th><th className="px-4 py-3 text-left font-semibold">Quantity</th><th className="px-4 py-3 text-right font-semibold">Rate</th><th className="px-4 py-3 text-right font-semibold">Amount</th><th className="px-4 py-3"></th></tr></thead>
                        <tbody>
                            {consolidatedCart.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">Your cart is empty.</td></tr>}
                            {consolidatedCart.map(item => {
                                const { product, totalQuantity, totalValue, tax, batches } = item;
                                const unitsPerPack = getUnitsInPack(product.pack); 
                                const isStripItem = unitsPerPack > 1;
                                const weightedAveragePrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;
                                const strips = isStripItem ? Math.floor(totalQuantity / unitsPerPack) : 0;
                                const units = isStripItem ? totalQuantity % unitsPerPack : totalQuantity;
                                const isExpanded = expandedRows.includes(product.id);
                                const batchesInSale = batches.map(b => b.batch.id);
                                return (
                                <React.Fragment key={product.id}>
                                <tr className="border-t border-border">
                                    <td className="px-4 py-3">
                                        <button onClick={() => toggleRow(product.id)} className="font-semibold text-left flex items-center justify-between gap-2 w-full" aria-expanded={isExpanded} aria-controls={`details-${product.id}`}>
                                            <span className="flex items-center gap-2">
                                                {product.name}
                                                {product.schedule && product.schedule !== 'none' && (
                                                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${scheduleColors[product.schedule]}`}>
                                                        Sch {product.schedule.toUpperCase()}
                                                    </span>
                                                )}
                                            </span>
                                            <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                        <div className="flex items-center gap-2 flex-wrap mt-1">
                                            {!isRghs && <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary">GST {tax}%</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                             {isStripItem ? (<><input type="number" min="0" value={strips || ''} onChange={e => handleQuantityChange(product.id, product.pack, e.target.value, String(units))} className="w-14 p-1.5 text-center border border-border rounded-md bg-input" placeholder="Strips"/><span>/</span><input type="number" min="0" value={units || ''} onChange={e => handleQuantityChange(product.id, product.pack, String(strips), e.target.value)} className="w-14 p-1.5 text-center border border-border rounded-md bg-input" placeholder={product.pack.includes('cap')?'Caps':'Tabs'}/></>) : (<input type="number" min="0" value={units || ''} onChange={e => handleQuantityChange(product.id, product.pack, '0', e.target.value)} className="w-14 p-1.5 text-center border border-border rounded-md bg-input" placeholder="Qty"/>)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        ₹{weightedAveragePrice.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold">₹{totalValue.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-center"><button onClick={() => removeProductFromCart(product.id)} className="text-destructive hover:text-destructive/80"><XIcon className="w-5 h-5"/></button></td>
                                </tr>
                                {isExpanded && (
                                    <tr id={`details-${product.id}`}><td colSpan={5} className="p-0"><div className="bg-secondary/50 p-3">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
                                            <div><strong>Mfr:</strong> {product.manufacturer}</div>
                                            <div><strong>Category:</strong> {product.category || 'N/A'}</div>
                                            <div><strong>Salts:</strong> {product.salts || 'N/A'}</div>
                                            <div><strong>Min Stock:</strong> {product.minStock || 20}</div>
                                        </div>
                                        <div className="max-h-40 overflow-y-auto"><table className="w-full text-xs">
                                            <thead className="text-muted-foreground bg-secondary sticky top-0"><tr>
                                                <th className="px-2 py-1 font-semibold text-left">Batch No.</th><th className="px-2 py-1 font-semibold text-left">Expiry</th>
                                                <th className="px-2 py-1 font-semibold text-right">Stock</th><th className="px-2 py-1 font-semibold text-right">MRP</th>
                                                <th className="px-2 py-1 font-semibold text-right">Rate</th>
                                            </tr></thead>
                                            <tbody>{product.batches.filter(b => b.stock > 0).map(batch => (<tr key={batch.id} className={`border-t border-border/50 ${batchesInSale.includes(batch.id) ? 'bg-primary/10 font-bold' : ''}`}>
                                                <td className="px-2 py-1">{batch.batchNumber}</td>
                                                <td className="px-2 py-1">{batch.expiryDate.split('-').reverse().join('-')}</td>
                                                <td className="px-2 py-1 text-right">{batch.stock}</td>
                                                <td className="px-2 py-1 text-right">₹{batch.mrp.toFixed(2)}</td>
                                                <td className="px-2 py-1 text-right">₹{batch.price.toFixed(2)}</td>
                                            </tr>))}</tbody>
                                        </table></div>
                                    </div></td></tr>
                                )}
                                </React.Fragment>
                            )})
                            }
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex flex-col bg-card rounded-xl border border-border p-6 h-full">
                <h2 className="text-2xl font-bold mb-4">Billing Summary</h2>
                <div className="flex-grow text-sm space-y-2 overflow-y-auto pr-2">
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
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">SGST @ {parseFloat(rate)/2}%:</span><span className="font-semibold">+ ₹{sgst.toFixed(2)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">CGST @ {parseFloat(rate)/2}%:</span><span className="font-semibold">+ ₹{cgst.toFixed(2)}</span></div>
                        </div>
                    ))}
                     {scheduleItemsInCart.length > 0 && (
                        <div className="border-t border-border pt-4 mt-2">
                            <h3 className="text-md font-semibold mb-3 text-foreground">Prescription Required</h3>
                            <input type="file" ref={prescriptionFileInputRef} onChange={handleFileSelected} className="hidden" accept="image/*,application/pdf" />
                            <ul className="space-y-3">
                                {scheduleItemsInCart.map(({ product }) => {
                                    const prescription = prescriptions[product.id];
                                    return (
                                        <li key={product.id} className="text-sm">
                                            <p className="font-semibold">{product.name}</p>
                                            {!prescription ? (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <button onClick={() => handleUploadClick(product.id)} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200">Upload</button>
                                                    <button onClick={() => handleSkipPrescription(product.id)} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200">Skip</button>
                                                </div>
                                            ) : prescription.status === 'uploaded' ? (
                                                <div className="flex items-center justify-between mt-1 p-2 bg-success/10 rounded-md">
                                                    <p className="text-xs text-green-800 font-medium truncate">✅ {prescription.file?.name}</p>
                                                    <button onClick={() => handleResetPrescription(product.id)} className="text-xs font-semibold text-muted-foreground hover:underline">Change</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between mt-1 p-2 bg-amber-100 rounded-md">
                                                    <p className="text-xs text-amber-800 font-medium">⚠️ Prescription skipped</p>
                                                    <button onClick={() => handleResetPrescription(product.id)} className="text-xs font-semibold text-muted-foreground hover:underline">Change</button>
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                            {isCheckoutDisabled && <p className="text-xs text-amber-600 mt-3 text-center p-2 bg-amber-50 rounded-md">Please upload or skip prescriptions for all schedule medicines to proceed.</p>}
                        </div>
                    )}
                </div>
                
                <div className="border-t border-border pt-4 mt-auto">
                    <div className="flex justify-between items-center text-2xl font-bold mb-4"><span>Grand Total:</span><span className="text-primary">₹{billSummary.grandTotal.toFixed(2)}</span></div>
                    <div className="mb-4">
                        <p className="text-sm font-semibold mb-2">Payment Method</p>
                        <div className="flex items-center gap-2"><PaymentButton method="Cash" icon={<CashIcon className="w-6 h-6"/>} /><PaymentButton method="Card" icon={<CardIcon className="w-6 h-6"/>} /><PaymentButton method="UPI" icon={<UpiIcon className="w-6 h-6"/>} /><PaymentButton method="Credit" icon={<CreditIcon className="w-6 h-6"/>} /></div>
                    </div>
                    <button onClick={handleCheckout} disabled={isCheckoutDisabled} className="w-full py-3 bg-success text-white rounded-lg text-lg font-semibold hover:bg-success/90 disabled:bg-muted disabled:cursor-not-allowed transition-all relative group">
                        <span className="relative z-10">Complete Sale</span>
                        {isCheckoutDisabled && (
                           <span className="absolute -top-10 left-1/2 -translate-x-1/2 w-max px-3 py-1 bg-foreground text-background text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                Handle all required prescriptions to enable
                           </span>
                        )}
                    </button>
                </div>
            </div>
            {showInvoice && lastBillDetails && <InvoiceModal billDetails={lastBillDetails} products={products} onClose={handleCloseInvoice} />}
            {isScannerOpen && <PrescriptionScannerModal onClose={() => setIsScannerOpen(false)} onConfirm={handlePrescriptionImport} />}
        </div>
    );
};

export default Sell;