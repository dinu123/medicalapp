import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { Supplier } from '../types';
import { PlusIcon } from './Icons';
import { SupplierModal } from './SupplierModal';

const Suppliers: React.FC = () => {
    const { suppliers, setSuppliers } = useContext(AppContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

    const handleOpenModal = (supplier?: Supplier) => {
        setSupplierToEdit(supplier || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSupplierToEdit(null);
    };

    const handleSaveSupplier = (savedSupplier: Supplier) => {
        if (suppliers.some(s => s.id === savedSupplier.id)) {
            // Edit
            setSuppliers(prev => prev.map(s => s.id === savedSupplier.id ? savedSupplier : s));
        } else {
            // Add
            setSuppliers(prev => [...prev, savedSupplier]);
        }
        handleCloseModal();
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-foreground">Suppliers</h1>
                <button onClick={() => handleOpenModal()} className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold shadow-md">
                    <PlusIcon className="mr-2"/>Add New Supplier
                </button>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm text-left text-foreground">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border">
                        <tr>
                            <th className="px-6 py-3 font-semibold border-r border-border">Name</th>
                            <th className="px-6 py-3 font-semibold border-r border-border">Contact</th>
                            <th className="px-6 py-3 font-semibold border-r border-border">GSTIN</th>
                            <th className="px-6 py-3 font-semibold border-r border-border">Default Discount</th>
                            <th className="px-6 py-3 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {suppliers.map(s => (
                            <tr key={s.id} className="hover:bg-secondary/50">
                                <td className="px-6 py-4">
                                    <p className="font-bold">{s.name}</p>
                                    <p className="text-xs text-muted-foreground">{s.address}</p>
                                </td>
                                <td className="px-6 py-4">{s.contact}</td>
                                <td className="px-6 py-4">{s.gstin}</td>
                                <td className="px-6 py-4">{s.defaultDiscount}%</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => handleOpenModal(s)} className="font-semibold text-primary hover:underline">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {suppliers.length === 0 && <p className="text-center py-12 text-muted-foreground">No suppliers found.</p>}
            </div>

            <SupplierModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveSupplier}
                supplierToEdit={supplierToEdit}
            />
        </div>
    );
};

export default Suppliers;