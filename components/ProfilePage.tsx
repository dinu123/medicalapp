import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { User, StoreSettings } from '../types';
import { ProfileIcon } from './Icons';

const ProfilePage: React.FC = () => {
    const { currentUser, updateCurrentUser, storeSettings, setStoreSettings } = useContext(AppContext);
    
    const [userForm, setUserForm] = useState<Partial<User>>({
        username: currentUser?.username || '',
        email: currentUser?.email || ''
    });

    const [storeForm, setStoreForm] = useState<StoreSettings>({
        storeName: storeSettings.storeName || '',
        storeAddress: storeSettings.storeAddress || '',
        contactNumber: storeSettings.contactNumber || '',
        gstin: storeSettings.gstin || ''
    });

    const [saved, setSaved] = useState<string | null>(null);

    useEffect(() => {
        if (currentUser) {
            setUserForm({ username: currentUser.username, email: currentUser.email });
        }
        setStoreForm(storeSettings);
    }, [currentUser, storeSettings]);

    const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserForm({ ...userForm, [e.target.name]: e.target.value });
    };

    const handleStoreChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setStoreForm({ ...storeForm, [e.target.name]: e.target.value });
    };

    const handleUserSave = (e: React.FormEvent) => {
        e.preventDefault();
        updateCurrentUser(userForm);
        showSavedMessage('user');
    };

    const handleStoreSave = (e: React.FormEvent) => {
        e.preventDefault();
        setStoreSettings(storeForm);
        showSavedMessage('store');
    };
    
    const showSavedMessage = (form: 'user' | 'store') => {
        setSaved(form);
        setTimeout(() => setSaved(null), 2500);
    };
    
    const inputClass = "w-full p-3 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-ring transition-colors";
    const labelClass = "block text-sm font-semibold text-muted-foreground mb-1";
    const saveButtonClass = (form: 'user' | 'store') => `px-5 py-2.5 rounded-lg font-semibold shadow-md transition-colors ${saved === form ? 'bg-success text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`;

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
                <ProfileIcon className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">
                {/* User Details Section */}
                <form onSubmit={handleUserSave} className="bg-card border border-border p-6 rounded-xl">
                    <h2 className="text-xl font-semibold text-foreground mb-4">Personal Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="username" className={labelClass}>Username</label>
                            <input type="text" id="username" name="username" value={userForm.username} onChange={handleUserChange} className={inputClass} required />
                        </div>
                        <div>
                            <label htmlFor="email" className={labelClass}>Email Address</label>
                            <input type="email" id="email" name="email" value={userForm.email} onChange={handleUserChange} className={inputClass} required />
                        </div>
                    </div>
                    <div className="flex justify-end mt-6">
                        <button type="submit" className={saveButtonClass('user')}>
                            {saved === 'user' ? 'Saved!' : 'Save Changes'}
                        </button>
                    </div>
                </form>

                {/* Store Details Section (Admin Only) */}
                {currentUser?.role === 'admin' && (
                    <form onSubmit={handleStoreSave} className="bg-card border border-border p-6 rounded-xl">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Store Details (for Invoices)</h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="storeName" className={labelClass}>Store Name</label>
                                <input type="text" id="storeName" name="storeName" value={storeForm.storeName} onChange={handleStoreChange} className={inputClass} required />
                            </div>
                             <div>
                                <label htmlFor="storeAddress" className={labelClass}>Store Address</label>
                                <textarea id="storeAddress" name="storeAddress" value={storeForm.storeAddress} onChange={handleStoreChange} className={`${inputClass} min-h-[80px]`} required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="contactNumber" className={labelClass}>Contact Number</label>
                                    <input type="text" id="contactNumber" name="contactNumber" value={storeForm.contactNumber} onChange={handleStoreChange} className={inputClass} required />
                                </div>
                                <div>
                                    <label htmlFor="gstin" className={labelClass}>GSTIN</label>
                                    <input type="text" id="gstin" name="gstin" value={storeForm.gstin} onChange={handleStoreChange} className={inputClass} required />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button type="submit" className={saveButtonClass('store')}>
                                {saved === 'store' ? 'Saved!' : 'Save Store Details'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
