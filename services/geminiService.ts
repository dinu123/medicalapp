import { GoogleGenAI, Type } from "@google/genai";
import { Product } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Gemini API key not found. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

// Helper function to convert File to GoogleGenerativeAI.Part
const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};


export const getMedicineInfo = async (medicineName: string): Promise<string> => {
  if (!API_KEY) return "API Key not configured.";
  try {
    const prompt = `Provide a concise summary for the medicine "${medicineName}" suitable for a pharmacist. Include: 1. Primary Uses, 2. Common Side Effects, 3. Standard Dosage Information. Format the response in clear sections using markdown.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error fetching medicine info from Gemini:", error);
    return "Failed to fetch information. Please check the console for details.";
  }
};

export const getInventorySummary = async (products: Product[]): Promise<string> => {
    if (!API_KEY) return "API Key not configured.";
  const totalStock = products.reduce((sum, p) => sum + p.batches.reduce((batchSum, b) => batchSum + b.stock, 0), 0);
  if (totalStock === 0) {
    return "The inventory is currently empty. No summary can be generated.";
  }

  try {
     const inventoryData = products.flatMap(p => 
      p.batches.map(b => 
        `- ${p.name} (Batch: ${b.batchNumber}, Stock: ${b.stock}, Expires: ${b.expiryDate}, MRP: ${b.mrp.toFixed(2)})`
      )
    ).join('\n');


    const prompt = `
      You are an expert inventory analyst for a pharmacy.
      Based on the following inventory data, provide a brief, actionable summary for the store owner.
      
      - Highlight the top 3 products with the lowest total stock.
      - Identify any batches that have expired or are expiring within the next 3 months.
      - Suggest one general action item based on the data (e.g., "Consider a promotion for item X" or "Prioritize reordering low-stock items").

      Current Inventory:
      ${inventoryData}

      Please provide the summary in a clear, easy-to-read format.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating inventory summary from Gemini:", error);
    return "Failed to generate summary. Please check the console for details.";
  }
};

const parseNumeric = (value: any): number => {
    let currentVal = value;

    // Continuously unwrap objects that have a 'value' property.
    for (let i = 0; i < 5 && typeof currentVal === 'object' && currentVal !== null && 'value' in currentVal; i++) {
        currentVal = currentVal.value;
    }

    if (typeof currentVal === 'number') {
        return isFinite(currentVal) ? currentVal : 0;
    }
    
    if (typeof currentVal === 'string') {
        const num = parseFloat(currentVal.replace(/[^0-9.-]/g, ''));
        return isFinite(num) ? num : 0;
    }

    return 0;
};


const parseString = (value: any): string => {
    if (typeof value === 'string') {
        return value.trim();
    }
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value !== 'object') {
        return String(value);
    }
    return JSON.stringify(value);
};


export const parseInventoryFile = async (file: File): Promise<{ products: Omit<Product, 'id' | 'batches'>[] }> => {
    if (!API_KEY) {
        throw new Error("API Key not configured.");
    }
    
    const imagePart = await fileToGenerativePart(file);

    const textPart = {
        text: `You are an expert document parsing AI. Your task is to analyze the provided image of an invoice and extract all product line items into a JSON array.

Focus exclusively on the main table containing the product list.

For each object in the array, use the following camelCase keys corresponding to the columns you find in the image. **Only include a key if you find a corresponding column and value in the row.**

- \`serialNumber\`: from columns like 's.no.', 'sr.', 'sr. no.'
- \`hsnCode\`: from columns like 'hsn code', 'hsn'
- \`name\`: from columns like 'description', 'desc', 'product name'
- \`salts\`: from columns like 'composition', 'salts'
- \`pack\`: from columns like 'packing', 'pack'
- \`manufacturer\`: from columns like 'manufacturer', 'mfr'
- \`batchNumber\`: from columns like 'batch no', 'batchno'
- \`expiryDate\`: from columns like 'exp dt', 'expiry'. IMPORTANT: Convert MM-YYYY format to YYYY-MM-DD (e.g., 03-2022 becomes 2022-03-31).
- \`stock\`: from columns like 'quantity', 'qty'
- \`free\`: from columns like 'free qty', 'free', 'fr'
- \`scheme\`: from columns like 'scheme', 'sch'
- \`mrp\`: from columns like 'mrp'
- \`price\`: from columns like 'rate', 'price'
- \`discount\`: from columns like 'discount %', 'disc %'
- \`tax\`: from columns like 'gst%', 'tax %', 'gst'. If CGST and SGST columns are separate, add their percentages for a total tax rate.
- \`amount\`: from columns like 'total', 'amount', 'value'
- \`schedule\`: Analyze the product name. If it contains terms like 'H1', 'narcotic', or 'TB', set this to "H1", "narcotic", or "tb" respectively. If it's a known prescription drug, set to "H". Otherwise, omit this key.

CRITICAL INSTRUCTIONS:
1.  **JSON Output:** Your output MUST be a valid JSON array of objects.
2.  **Dynamic Keys:** The keys in each JSON object must correspond directly to the columns you find in the image. Do not include keys for columns that are not present.
3.  **Data Types:** Ensure numbers are formatted as numbers (integers or floats) and dates are strings in YYYY-MM-DD format.`
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, imagePart] },
            config: {
                responseMimeType: 'application/json',
            },
        });

        const jsonString = response.text.trim();
        const cleanedJsonString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const parsedData: any[] = JSON.parse(cleanedJsonString);

        if (!Array.isArray(parsedData) || parsedData.length === 0) {
            return { products: [] };
        }
        
        const normalizedProducts = parsedData
            .filter(item => item && typeof item === 'object' && item.name)
            .map(item => {
                const product: any = {
                    hsnCode: parseString(item.hsnCode),
                    name: parseString(item.name),
                    pack: parseString(item.pack),
                    manufacturer: parseString(item.manufacturer),
                    salts: parseString(item.salts),
                    schedule: parseString(item.schedule) as any,
                    // These are batch properties, but we'll attach them at the top level for processing in the modal
                    batchNumber: parseString(item.batchNumber),
                    expiryDate: parseString(item.expiryDate),
                    stock: parseNumeric(item.stock),
                    mrp: parseNumeric(item.mrp),
                    price: parseNumeric(item.price),
                    discount: parseNumeric(item.discount),
                    tax: parseNumeric(item.tax),
                    amount: parseNumeric(item.amount),
                };

                return product;
            })
            .filter(item => item.name.length > 0);
        
        return { products: normalizedProducts };

    } catch (error) {
        console.error("Error parsing inventory file with Gemini:", error);
        throw new Error("Failed to parse the file. The file might contain invalid JSON or the AI could not process it correctly.");
    }
};