import { Product, Transaction, Purchase, Batch, MedicineSchedule, PurchaseStatus, Supplier, Customer } from '../types';

// Base product templates for realistic data generation
const productTemplates = [
  { baseName: 'Paracetamol 500mg', hsn: '30049099', pack: '10 tabs', mfr: 'Pharma Inc.', tax: 12, salts: 'Paracetamol', schedule: 'none' as MedicineSchedule, category: 'Analgesic', minStock: 50 },
  { baseName: 'Amoxicillin 250mg', hsn: '30041090', pack: '10 caps', mfr: 'Sun Pharma', tax: 12, salts: 'Amoxicillin', schedule: 'H' as MedicineSchedule, category: 'Antibiotic', minStock: 30 },
  { baseName: 'Ibuprofen 200mg', hsn: '30049011', pack: '15 tabs', mfr: 'Pharma Inc.', tax: 12, salts: 'Ibuprofen', schedule: 'none' as MedicineSchedule, category: 'NSAID', minStock: 40 },
  { baseName: 'Cetirizine 10mg', hsn: '30049029', pack: '10 tabs', mfr: 'AllergyCure', tax: 5, salts: 'Cetirizine', schedule: 'none' as MedicineSchedule, category: 'Antiallergic', minStock: 25 },
  { baseName: 'Vitamin C 1000mg', hsn: '21069099', pack: '20 tabs', mfr: 'HealthBoost', tax: 18, salts: 'Ascorbic Acid', schedule: 'none' as MedicineSchedule, category: 'Vitamins', minStock: 60 },
  { baseName: 'Aspirin 75mg', hsn: '30049091', pack: '14 tabs', mfr: 'HeartCare', tax: 5, salts: 'Acetylsalicylic Acid', schedule: 'none' as MedicineSchedule, category: 'Analgesic', minStock: 35 },
  { baseName: 'Omeprazole 20mg', hsn: '30049023', pack: '10 caps', mfr: 'GastroWell', tax: 12, salts: 'Omeprazole', schedule: 'H' as MedicineSchedule, category: 'Antacid', minStock: 30 },
  { baseName: 'Losartan 50mg', hsn: '30049079', pack: '15 tabs', mfr: 'BP-Control', tax: 12, salts: 'Losartan Potassium', schedule: 'H' as MedicineSchedule, category: 'Cardiac', minStock: 20 },
  { baseName: 'Metformin 500mg', hsn: '30049049', pack: '30 tabs', mfr: 'DiaCure', tax: 12, salts: 'Metformin Hydrochloride', schedule: 'H' as MedicineSchedule, category: 'Antidiabetic', minStock: 50 },
  { baseName: 'Atorvastatin 10mg', hsn: '30049035', pack: '10 tabs', mfr: 'LipiGo', tax: 12, salts: 'Atorvastatin Calcium', schedule: 'H1' as MedicineSchedule, category: 'Cardiac', minStock: 25 },
  { baseName: 'Salbutamol Inhaler', hsn: '30049012', pack: '200 dose', mfr: 'BreatheEasy', tax: 18, salts: 'Salbutamol Sulphate', schedule: 'H' as MedicineSchedule, category: 'Respiratory', minStock: 15 },
  { baseName: 'Diclofenac 50mg', hsn: '30049099', pack: '10 tabs', mfr: 'Torrent Pharma', tax: 18, salts: 'Diclofenac Diethylamine', schedule: 'H' as MedicineSchedule, category: 'NSAID', minStock: 20 },
  { baseName: 'Multivitamin Syrup', hsn: '21069099', pack: '200ml', mfr: 'NutriLife', tax: 18, salts: 'Multiple Vitamins', schedule: 'none' as MedicineSchedule, category: 'Vitamins', minStock: 40 },
  { baseName: 'Cough Syrup DX', hsn: '30049039', pack: '100ml', mfr: 'CoughCure', tax: 12, salts: 'Dextromethorphan, Phenylephrine', schedule: 'none' as MedicineSchedule, category: 'Respiratory', minStock: 30 },
  { baseName: 'Pain Relief Spray', hsn: '30049099', pack: '55g', mfr: 'MoveFree', tax: 18, salts: 'Diclofenac, Methyl Salicylate', schedule: 'none' as MedicineSchedule, category: 'Topical', minStock: 25 },
  { baseName: 'Digital Thermometer', hsn: '90251190', pack: '1 pc', mfr: 'MediCare Devices', tax: 12, salts: 'N/A', schedule: 'none' as MedicineSchedule, category: 'Device', minStock: 10 },
  { baseName: 'Antacid Liquid 170ml', hsn: '30049021', pack: '170ml', mfr: 'GastroWell', tax: 12, salts: 'Magnesium Hydroxide, Simethicone', schedule: 'none' as MedicineSchedule, category: 'Antacid', minStock: 20 },
  { baseName: 'Band-Aid Assorted', hsn: '30051090', pack: '100 pcs', mfr: 'FirstAid Co.', tax: 5, salts: 'N/A', schedule: 'none' as MedicineSchedule, category: 'Consumable', minStock: 50 },
];

export const initialCustomers: Customer[] = [
    { id: 'cust_1', name: 'Ramesh Kumar', contact: '9876543210' },
    { id: 'cust_2', name: 'Sunita Sharma', contact: '9876543211' },
    { id: 'cust_3', name: 'Amit Patel', contact: '9876543212' },
    { id: 'cust_4', name: 'Priya Singh', contact: '9876543213' },
    { id: 'cust_5', name: 'Vijay Gupta', contact: '9876543214' },
    { id: 'cust_6', name: 'Anjali Verma', contact: '9876543215' },
    { id: 'cust_7', name: 'Sanjay Reddy', contact: '9876543216' },
    { id: 'cust_8', name: 'Pooja Desai', contact: '9876543217' },
];

export const initialSuppliers: Supplier[] = [
    { id: 'supp_1', name: 'Global Pharma', address: '123 Pharma Lane, Mumbai', contact: '9876543210', gstin: '27ABCDE1234F1Z5', dlNumber: 'MH/12345', foodLicenseNumber: 'FSL/98765', defaultDiscount: 10 },
    { id: 'supp_2', name: 'HealthWell Distributors', address: '456 Health St, Delhi', contact: '9876543211', gstin: '07FGHIJ5678K1Z9', dlNumber: 'DL/54321', foodLicenseNumber: 'FSL/87654', defaultDiscount: 12 },
    { id: 'supp_3', name: 'MedSupply Co.', address: '789 Supply Ave, Bangalore', contact: '9876543212', gstin: '29LMNOP9012Q1Z3', dlNumber: 'KA/67890', foodLicenseNumber: 'FSL/76543', defaultDiscount: 8 },
    { id: 'supp_4', name: 'Carelife Meds', address: '101 Care Rd, Chennai', contact: '9876543213', gstin: '33QRSTU3456V1Z7', dlNumber: 'TN/13579', foodLicenseNumber: 'FSL/65432', defaultDiscount: 15 },
    { id: 'supp_5', name: 'National Healthcare', address: '202 Nation Blvd, Kolkata', contact: '9876543214', gstin: '19WXYZV7890B1Z1', dlNumber: 'WB/24680', foodLicenseNumber: 'FSL/54321', defaultDiscount: 10 },
];


const generateMockData = () => {
    const products: Product[] = [];
    const transactions: Transaction[] = [];
    const purchases: Purchase[] = [];
    const today = new Date();
    const paymentMethods: ('Cash' | 'Card' | 'UPI')[] = ['Cash', 'Card', 'UPI'];

    // Initialize Products from templates
    productTemplates.forEach((template, index) => {
        products.push({
            id: `prod_${index + 1}`,
            name: template.baseName,
            hsnCode: template.hsn,
            pack: template.pack,
            manufacturer: template.mfr,
            salts: template.salts,
            schedule: template.schedule,
            category: template.category,
            minStock: template.minStock,
            batches: [],
        });
    });

    // Generate Purchases and Batches over the last year
    products.forEach(product => {
        // Create 1 to 3 batches for each product
        const numBatches = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numBatches; i++) {
            const purchaseDate = new Date(today.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000);
            const expiryDate = new Date(purchaseDate);
            expiryDate.setFullYear(purchaseDate.getFullYear() + (Math.floor(Math.random() * 2) + 1)); // Expires in 1-2 years
            
            // Special expiry dates for specific products for testing
            if (product.name.includes('Amoxicillin')) {
                 expiryDate.setFullYear(2025);
                 expiryDate.setMonth(5); // June
            }
             if (product.name.includes('Diclofenac')) {
                 expiryDate.setFullYear(2025);
                 expiryDate.setMonth(1); // Feb
            }

            const quantity = Math.floor(Math.random() * 400) + 100; // Increased initial stock
            const price = parseFloat((Math.random() * 20 + 5).toFixed(2));
            const mrp = parseFloat((price * 1.25).toFixed(2));
            const discount = Math.random() > 0.7 ? 10 : 0;

            const batchId = `batch_${product.id}_${i}`;
            const newBatch: Batch = {
                id: batchId,
                batchNumber: `B${Math.floor(Math.random() * 9000) + 1000}`,
                expiryDate: expiryDate.toISOString().split('T')[0],
                stock: quantity,
                mrp: mrp,
                price: price,
                discount: discount,
            };
            product.batches.push(newBatch);
            
            const itemAmount = (quantity * price) * (1 - discount / 100);
            
            const gstRate = product.hsnCode.startsWith('3004') ? 12 : product.hsnCode.startsWith('2106') ? 18 : 5;
            const gstAmount = itemAmount * (gstRate / 100);
            const finalTotal = itemAmount + gstAmount;

            const randomSupplier = initialSuppliers[Math.floor(Math.random() * initialSuppliers.length)];

            purchases.push({
                id: `purch_${product.id}_${i}`,
                supplierId: randomSupplier.id,
                date: purchaseDate.toISOString(),
                status: Math.random() > 0.5 ? 'paid' : 'credit',
                items: [{
                    productId: product.id,
                    productName: product.name,
                    batchId: batchId,
                    quantity: quantity,
                    price: price,
                    amount: parseFloat(itemAmount.toFixed(2)),
                }],
                total: parseFloat(finalTotal.toFixed(2)),
            });
        }
    });

    // Generate Sales Transactions based on available batches
    for (let i = 0; i < 500; i++) { // Reduced number of sales
        const saleDate = new Date(today.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000);
        const itemsInSale = [];
        let saleTotal = 0;
        
        // Pick a random product that has stock
        const availableProducts = products.filter(p => p.batches.some(b => b.stock > 10)); // Ensure some stock remains
        if (availableProducts.length === 0) continue;

        const productToSell = availableProducts[Math.floor(Math.random() * availableProducts.length)];
        const batchToSellFrom = productToSell.batches.find(b => b.stock > 10);

        if (batchToSellFrom) {
            const quantity = Math.min(batchToSellFrom.stock, Math.floor(Math.random() * 10) + 1);
            
            const itemMrpTotal = quantity * batchToSellFrom.mrp;
            const taxRate = productToSell.hsnCode.startsWith('3004') ? 12 : productToSell.hsnCode.startsWith('2106') ? 18 : 5;
            const gstAmount = itemMrpTotal * (taxRate / 100);
            const itemTotal = itemMrpTotal + gstAmount;

            saleTotal += itemTotal;

            itemsInSale.push({
                productId: productToSell.id,
                productName: productToSell.name,
                batchId: batchToSellFrom.id,
                quantity,
                price: batchToSellFrom.mrp,
                tax: taxRate
            });

            // Decrement stock
            batchToSellFrom.stock -= quantity;
            const customer = initialCustomers[Math.floor(Math.random() * initialCustomers.length)];

            transactions.push({
                id: `trans_${saleDate.getTime()}_${i}`,
                customerId: customer.id,
                customerName: customer.name,
                items: itemsInSale,
                total: parseFloat(saleTotal.toFixed(2)),
                date: saleDate.toISOString(),
                discountPercentage: 0,
                status: 'paid',
                paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            });
        }
    }
    
    // Manually set some items to low stock for consistent UI
    const amox = products.find(p => p.name.includes('Amoxicillin'));
    if (amox) amox.batches[0].stock = 8;
    const diclo = products.find(p => p.name.includes('Diclofenac'));
    if (diclo) diclo.batches[0].stock = 5;

    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    purchases.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { products, transactions, purchases };
};


// Generate the data on initial load
const { 
    products: generatedProducts, 
    transactions: generatedTransactions, 
    purchases: generatedPurchases 
} = generateMockData();

export const initialProducts: Product[] = generatedProducts;
export const initialTransactions: Transaction[] = generatedTransactions;
export const initialPurchases: Purchase[] = generatedPurchases;