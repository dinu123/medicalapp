import React, { useState } from 'react';
import { getMedicineInfo, getInventorySummary, getInventoryAnalysis } from '../services/geminiService';
import { getProducts } from '../services/productService';
import { getTransactions } from '../services/transactionService';
import { SparklesIcon } from './Icons';

const GeminiHelper: React.FC = () => {
    
    // State for medicine info
    const [medicineName, setMedicineName] = useState('');
    const [medicineInfo, setMedicineInfo] = useState('');
    const [isMedicineLoading, setIsMedicineLoading] = useState(false);

    // State for inventory summary
    const [inventorySummary, setInventorySummary] = useState('');
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);

    // State for inventory analysis
    const [inventoryAnalysis, setInventoryAnalysis] = useState('');
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

    const handleGetInventoryAnalysis = async () => {
        setIsAnalysisLoading(true);
        setInventoryAnalysis('');
        try {
            const [products, transactions] = await Promise.all([
                getProducts(),
                getTransactions()
            ]);
            const analysis = await getInventoryAnalysis(products, transactions);
            setInventoryAnalysis(analysis);
        } catch (error) {
            setInventoryAnalysis('An error occurred while generating the inventory analysis.');
            console.error(error);
        } finally {
            setIsAnalysisLoading(false);
        }
    };

    const handleGetMedicineInfo = async () => {
        if (!medicineName) return;
        setIsMedicineLoading(true);
        setMedicineInfo('');
        try {
            const info = await getMedicineInfo(medicineName);
            setMedicineInfo(info);
        } catch (error) {
            setMedicineInfo('An error occurred while fetching medicine information.');
            console.error(error);
        } finally {
            setIsMedicineLoading(false);
        }
    };

    const handleGetInventorySummary = async () => {
        setIsSummaryLoading(true);
        setInventorySummary('');
        try {
            const products = await getProducts();
            const summary = await getInventorySummary(products);
            setInventorySummary(summary);
        } catch (error) {
            setInventorySummary('An error occurred while generating the inventory summary.');
            console.error(error);
        } finally {
            setIsSummaryLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="flex items-center gap-3">
                <SparklesIcon className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">AI Helper</h1>
            </div>

            {/* Medicine Information Section */}
            <div className="bg-card border border-border p-6 rounded-xl">
                <h2 className="text-xl font-semibold text-foreground mb-4">Get Medicine Information</h2>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        value={medicineName}
                        onChange={(e) => setMedicineName(e.target.value)}
                        placeholder="Enter medicine name (e.g., Paracetamol)"
                        className="w-full p-3 border border-border rounded-lg bg-input text-foreground focus:ring-2 focus:ring-ring"
                    />
                    <button
                        onClick={handleGetMedicineInfo}
                        disabled={isMedicineLoading || !medicineName}
                        className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md disabled:bg-muted disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isMedicineLoading ? 'Loading...' : 'Search'}
                    </button>
                </div>
                {isMedicineLoading && (
                     <div className="text-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div><p className="mt-2 text-sm text-muted-foreground">AI is fetching data...</p></div>
                )}
                {medicineInfo && !isMedicineLoading && (
                    <div className="mt-4 p-4 bg-secondary rounded-lg">
                        <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{medicineInfo}</pre>
                    </div>
                )}
            </div>

            {/* Inventory Summary Section */}
            <div className="bg-card border border-border p-6 rounded-xl">
                <h2 className="text-xl font-semibold text-foreground mb-2">Generate Inventory Summary</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Get an AI-powered analysis of your current stock, highlighting low-stock items and expiring products.
                </p>
                <button
                    onClick={handleGetInventorySummary}
                    disabled={isSummaryLoading}
                    className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md disabled:bg-muted disabled:cursor-not-allowed"
                >
                    {isSummaryLoading ? 'Generating...' : 'Generate Summary'}
                </button>
                 {isSummaryLoading && (
                     <div className="text-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div><p className="mt-2 text-sm text-muted-foreground">AI is analyzing inventory...</p></div>
                )}
                {inventorySummary && !isSummaryLoading && (
                    <div className="mt-4 p-4 bg-secondary rounded-lg">
                        <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{inventorySummary}</pre>
                    </div>
                )}
            </div>

            {/* Advanced Inventory Analysis Section */}
            <div className="bg-card border border-border p-6 rounded-xl">
                <h2 className="text-xl font-semibold text-foreground mb-2">Advanced Inventory Analysis</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Get detailed insights on reorder priorities, slow-moving stock, and expiring items based on sales data.
                </p>
                <button
                    onClick={handleGetInventoryAnalysis}
                    disabled={isAnalysisLoading}
                    className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md disabled:bg-muted disabled:cursor-not-allowed"
                >
                    {isAnalysisLoading ? 'Analyzing...' : 'Generate Analysis'}
                </button>
                 {isAnalysisLoading && (
                     <div className="text-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div><p className="mt-2 text-sm text-muted-foreground">AI is analyzing sales data...</p></div>
                )}
                {inventoryAnalysis && !isAnalysisLoading && (
                    <div className="mt-4 p-4 bg-secondary rounded-lg">
                        <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{inventoryAnalysis}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GeminiHelper;