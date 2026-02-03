import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../App';
import { Supplier } from '../types';
import { PlusIcon, SearchIcon } from './Icons';
import { SupplierModal } from './SupplierModal';
import { searchSuppliers, getSuppliers } from '../services/supplierService';

const Suppliers: React.FC = () => {
    const { suppliers, setSuppliers } = useContext(AppContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>(suppliers);
    const [isSearching, setIsSearching] = useState(false);

    const debouncedSearch = useCallback(
        debounce(async (term: string) => {
            setIsSearching(true);
            try {
                const results = await searchSuppliers(term);
                setFilteredSuppliers(results.map((s: any) => ({ ...s, id: s._id })));
            } catch (error) {
                console.error('Search error:', error);
                setFilteredSuppliers([]);
            } finally {
                setIsSearching(false);
            }
        }, 300),
        []
    );

    useEffect(() => {
        setFilteredSuppliers(suppliers);
    }, [suppliers]);

    useEffect(() => {
        if (searchTerm.length === 0) {
            setFilteredSuppliers(suppliers);
        } else {
            debouncedSearch(searchTerm);
        }
    }, [searchTerm]);

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
            setSuppliers(prev => prev.map(s => s.id === savedSupplier.id ? savedSupplier : s));
        } else {
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

            <div className="relative mb-6">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, contact, GSTIN, license numbers..."
                    className="w-full max-w-lg p-2.5 pl-10 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring"
                    aria-label="Search suppliers"
                />
                {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                )}
            </div>

            <div className="bg-card rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm text-left text-foreground">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border">
                        <tr>
                            <th className="px-6 py-3 font-semibold border-r border-border">Name</th>
                            <th className="px-6 py-3 font-semibold border-r border-border">Contact</th>
                            <th className="px-6 py-3 font-semibold border-r border-border">GSTIN</th>
                            <th className="px-6 py-3 font-semibold border-r border-border">Drug License No.</th>
                            <th className="px-6 py-3 font-semibold border-r border-border">Food License No.</th>
                            <th className="px-6 py-3 font-semibold border-r border-border">Default Discount</th>
                            <th className="px-6 py-3 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredSuppliers.map(s => (
                            <tr key={s.id} className="hover:bg-secondary/50">
                                <td className="px-6 py-4">
                                    <p className="font-bold">{s.name}</p>
                                    <p className="text-xs text-muted-foreground">{s.address}</p>
                                </td>
                                <td className="px-6 py-4">{s.contact}</td>
                                <td className="px-6 py-4">{s.gstin}</td>
                                <td className="px-6 py-4">{s.dlNumber}</td>
                                <td className="px-6 py-4">{s.foodLicenseNumber}</td>
                                <td className="px-6 py-4">{s.defaultDiscount}%</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => handleOpenModal(s)} className="font-semibold text-primary hover:underline">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredSuppliers.length === 0 && <p className="text-center py-12 text-muted-foreground">No suppliers found.</p>}
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

function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
    let timeoutId: NodeJS.Timeout;
    return ((...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
}

export default Suppliers;