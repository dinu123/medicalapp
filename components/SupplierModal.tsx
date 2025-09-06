import React, { useState, useEffect } from 'react';
import { Supplier } from '../types';
import { XIcon } from './Icons';

export const SupplierModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (supplier: Supplier) => void;
    supplierToEdit?: Supplier | null;
}> = ({ isOpen, onClose, onSave, supplierToEdit }) => {
    const [supplier, setSupplier] = useState<Omit<Supplier, 'id' | 'id'>>({
        name: '', address: '', contact: '', gstin: '', dlNumber: '', foodLicenseNumber: '', defaultDiscount: 0
    });

    useEffect(() => {
        if (supplierToEdit) {
            setSupplier(supplierToEdit);
        } else {
            setSupplier({ name: '', address: '', contact: '', gstin: '', dlNumber: '', foodLicenseNumber: '', defaultDiscount: 0 });
        }
    }, [supplierToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setSupplier(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let finalSupplier: Supplier;
        if ('id' in supplier) {
            finalSupplier = supplier as Supplier;
        } else {
            finalSupplier = { ...supplier, id: `supp_${Date.now()}` };
        }
        onSave(finalSupplier);
    };

    if (!isOpen) return null;

    const inputClass = "w-full p-3 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring transition-colors";
    const labelClass = "block text-sm font-semibold text-muted-foreground mb-1";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60] p-4">
            <div className="bg-card text-card-foreground rounded-xl p-6 w-full max-w-2xl m-4 max-h-[90vh] flex flex-col border border-border shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{supplierToEdit ? 'Edit Supplier' : 'Add New Supplier'}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><XIcon /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2"><label className={labelClass}>Supplier Name</label><input type="text" name="name" value={supplier.name} onChange={handleChange} required className={inputClass} /></div>
                        <div className="md:col-span-2"><label className={labelClass}>Address</label><textarea name="address" value={supplier.address} onChange={handleChange} required className={`${inputClass} min-h-[80px]`} /></div>
                        <div><label className={labelClass}>Contact Number</label><input type="text" name="contact" value={supplier.contact} onChange={handleChange} required className={inputClass} /></div>
                        <div><label className={labelClass}>GSTIN</label><input type="text" name="gstin" value={supplier.gstin} onChange={handleChange} required className={inputClass} /></div>
                        <div><label className={labelClass}>Drug License No.</label><input type="text" name="dlNumber" value={supplier.dlNumber} onChange={handleChange} className={inputClass} /></div>
                        <div><label className={labelClass}>Food License No.</label><input type="text" name="foodLicenseNumber" value={supplier.foodLicenseNumber} onChange={handleChange} className={inputClass} /></div>
                        <div className="md:col-span-2"><label className={labelClass}>Default Discount (%)</label><input type="number" name="defaultDiscount" value={supplier.defaultDiscount} onChange={handleChange} className={inputClass} min="0" /></div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md">Save Supplier</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
