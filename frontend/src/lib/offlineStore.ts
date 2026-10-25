// Offline-first store and fallback database for QBill
// Ensures the app works 100% on mobile / Vercel even when the local backend server is not reachable.

export interface Shopkeeper {
  id: number;
  name: string;
  store_name: string;
  email: string;
  phone: string;
  address: string;
  upi_id: string;
  password?: string;
}

export interface ProductItem {
  id: number;
  name: string;
  value: string;
  barcode: string;
  color: string;
  width: string;
  sold: string;
  stock?: number;
  price?: number;
}

export const DEFAULT_DAILY_PRODUCTS: ProductItem[] = [
  // Dairy & Breakfast
  { id: 1, name: "Amul Taaza Milk 500ml", value: "₹30", barcode: "8901262010053", color: "bg-blue-500", width: "45%", sold: "0 sold", price: 30 },
  { id: 2, name: "Amul Gold Milk 500ml", value: "₹34", barcode: "8901262010060", color: "bg-amber-500", width: "35%", sold: "0 sold", price: 34 },
  { id: 3, name: "Amul Butter 100g", value: "₹58", barcode: "8901262010015", color: "bg-yellow-500", width: "30%", sold: "0 sold", price: 58 },
  { id: 4, name: "Harvest White Bread 400g", value: "₹45", barcode: "8901725111221", color: "bg-amber-600", width: "40%", sold: "0 sold", price: 45 },
  { id: 5, name: "Farm Fresh Eggs 6-Pack", value: "₹50", barcode: "8904000100234", color: "bg-orange-500", width: "25%", sold: "0 sold", price: 50 },
  { id: 6, name: "Mother Dairy Curd 400g", value: "₹35", barcode: "8901648001024", color: "bg-sky-500", width: "20%", sold: "0 sold", price: 35 },
  { id: 7, name: "Amul Cheese Slices 200g", value: "₹140", barcode: "8901262020113", color: "bg-yellow-600", width: "15%", sold: "0 sold", price: 140 },
  { id: 8, name: "Kelloggs Corn Flakes 250g", value: "₹110", barcode: "8901499008123", color: "bg-rose-500", width: "15%", sold: "0 sold", price: 110 },

  // Staples, Atta, Rice & Cooking Essentials
  { id: 9, name: "Aashirvaad Shudh Chakki Atta 5kg", value: "₹240", barcode: "8901725121015", color: "bg-amber-700", width: "50%", sold: "0 sold", price: 240 },
  { id: 10, name: "Fortune Basmati Rice 1kg", value: "₹120", barcode: "8906007280014", color: "bg-indigo-500", width: "35%", sold: "0 sold", price: 120 },
  { id: 11, name: "Tata Sampann Toor Dal 1kg", value: "₹165", barcode: "8901058853116", color: "bg-yellow-700", width: "25%", sold: "0 sold", price: 165 },
  { id: 12, name: "Tata Sampann Moong Dal 1kg", value: "₹140", barcode: "8901058853123", color: "bg-emerald-600", width: "20%", sold: "0 sold", price: 140 },
  { id: 13, name: "Fortune Sunlite Sunflower Oil 1L", value: "₹145", barcode: "8906007280021", color: "bg-amber-500", width: "40%", sold: "0 sold", price: 145 },
  { id: 14, name: "Dhara Mustard Oil 1L", value: "₹155", barcode: "8901648011030", color: "bg-yellow-600", width: "30%", sold: "0 sold", price: 155 },
  { id: 15, name: "Tata Salt 1kg", value: "₹28", barcode: "8901058852331", color: "bg-cyan-600", width: "60%", sold: "0 sold", price: 28 },
  { id: 16, name: "Pure Refined Sugar 1kg", value: "₹46", barcode: "8901001001001", color: "bg-slate-400", width: "55%", sold: "0 sold", price: 46 },

  // Tea, Coffee, Biscuits & Snacks
  { id: 17, name: "Tata Tea Premium 500g", value: "₹250", barcode: "8901058851013", color: "bg-emerald-700", width: "35%", sold: "0 sold", price: 250 },
  { id: 18, name: "Red Label Tea 250g", value: "₹135", barcode: "8901030383014", color: "bg-rose-600", width: "30%", sold: "0 sold", price: 135 },
  { id: 19, name: "Nescafe Classic Coffee 50g", value: "₹185", barcode: "8901058862019", color: "bg-amber-900", width: "20%", sold: "0 sold", price: 185 },
  { id: 20, name: "Parle-G Gold Biscuits 250g", value: "₹25", barcode: "8901719101016", color: "bg-yellow-500", width: "70%", sold: "0 sold", price: 25 },
  { id: 21, name: "Britannia Good Day Butter 100g", value: "₹30", barcode: "8901063012010", color: "bg-blue-600", width: "50%", sold: "0 sold", price: 30 },
  { id: 22, name: "Britannia Marie Gold 250g", value: "₹35", barcode: "8901063013024", color: "bg-amber-500", width: "45%", sold: "0 sold", price: 35 },
  { id: 23, name: "Maggi 2-Minute Noodles 4-Pack", value: "₹56", barcode: "8901058842011", color: "bg-yellow-500", width: "65%", sold: "0 sold", price: 56 },
  { id: 24, name: "Lays Magic Masala Chips 50g", value: "₹20", barcode: "8901491101021", color: "bg-blue-500", width: "60%", sold: "0 sold", price: 20 },

  // Soaps, Oral & Personal Care
  { id: 25, name: "Dettol Original Soap 75g", value: "₹38", barcode: "8901396112012", color: "bg-emerald-600", width: "40%", sold: "0 sold", price: 38 },
  { id: 26, name: "Lifebuoy Total Soap 125g", value: "₹36", barcode: "8901030391026", color: "bg-rose-500", width: "35%", sold: "0 sold", price: 36 },
  { id: 27, name: "Colgate Strong Teeth 100g", value: "₹62", barcode: "8901314010014", color: "bg-rose-600", width: "45%", sold: "0 sold", price: 62 },
  { id: 28, name: "Close Up Red Hot Gel 80g", value: "₹55", barcode: "8901030401015", color: "bg-red-600", width: "25%", sold: "0 sold", price: 55 },
  { id: 29, name: "Clinic Plus Shampoo 175ml", value: "₹110", barcode: "8901030412011", color: "bg-blue-600", width: "30%", sold: "0 sold", price: 110 },
  { id: 30, name: "Head & Shoulders Shampoo 180ml", value: "₹175", barcode: "8901314510026", color: "bg-sky-700", width: "20%", sold: "0 sold", price: 175 },

  // Household & Cleaning
  { id: 31, name: "Surf Excel Easy Wash Detergent 1kg", value: "₹135", barcode: "8901030022012", color: "bg-indigo-600", width: "45%", sold: "0 sold", price: 135 },
  { id: 32, name: "Rin Detergent Bar 250g", value: "₹20", barcode: "8901030031014", color: "bg-blue-700", width: "50%", sold: "0 sold", price: 20 },
  { id: 33, name: "Vim Dishwash Gel 250ml", value: "₹55", barcode: "8901030421013", color: "bg-lime-600", width: "40%", sold: "0 sold", price: 55 },
  { id: 34, name: "Harpic Power Plus 500ml", value: "₹95", barcode: "8901396211029", color: "bg-rose-700", width: "30%", sold: "0 sold", price: 95 },

  // Fresh Vegetables / Staples
  { id: 35, name: "Fresh Onions 1kg", value: "₹35", barcode: "8900000000018", color: "bg-purple-600", width: "70%", sold: "0 sold", price: 35 },
  { id: 36, name: "Fresh Potatoes 1kg", value: "₹30", barcode: "8900000000025", color: "bg-amber-600", width: "75%", sold: "0 sold", price: 30 },
  { id: 37, name: "Fresh Tomatoes 1kg", value: "₹40", barcode: "8900000000032", color: "bg-rose-500", width: "65%", sold: "0 sold", price: 40 },
  { id: 38, name: "Fresh Green Chillies 250g", value: "₹20", barcode: "8900000000049", color: "bg-emerald-500", width: "50%", sold: "0 sold", price: 20 },
  { id: 39, name: "Fresh Ginger 250g", value: "₹30", barcode: "8900000000056", color: "bg-amber-700", width: "45%", sold: "0 sold", price: 30 },
];

// Helper to get registered shopkeepers
export function getStoredShopkeepers(): Shopkeeper[] {
  try {
    return JSON.parse(localStorage.getItem("quantum_shopkeepers") || "[]");
  } catch {
    return [];
  }
}

// Register new shopkeeper offline
export function registerShopkeeperOffline(data: {
  name: string;
  email: string;
  password?: string;
  store_name: string;
}): { success: boolean; shopkeeper?: Shopkeeper; error?: string } {
  const shopkeepers = getStoredShopkeepers();
  const cleanEmail = data.email.trim().toLowerCase();

  if (shopkeepers.some((s) => s.email.toLowerCase() === cleanEmail)) {
    return { success: false, error: "An account with this email already exists" };
  }

  const newShopkeeper: Shopkeeper = {
    id: Date.now(),
    name: data.name.trim(),
    email: cleanEmail,
    password: data.password?.trim() || "",
    store_name: data.store_name.trim(),
    phone: "9876543210",
    address: `${data.store_name.trim()}, Main Market`,
    upi_id: `${cleanEmail.split("@")[0]}@upi`,
  };

  shopkeepers.push(newShopkeeper);
  localStorage.setItem("quantum_shopkeepers", JSON.stringify(shopkeepers));

  // Initialize store's products with the daily-need catalog
  initializeStoreProducts(cleanEmail);

  return { success: true, shopkeeper: newShopkeeper };
}

export const BUILTIN_ACCOUNTS: Shopkeeper[] = [
  {
    id: 1,
    name: "Rajesh Kumar",
    email: "shopkeeper@example.com",
    password: "password",
    store_name: "GreenBasket Store",
    phone: "9876543210",
    address: "MG Road Market, Bengaluru",
    upi_id: "rajeshkumar@upi",
  },
  {
    id: 2,
    name: "likith Simhadri",
    email: "likithsimhadri99@gmail.com",
    password: "Iqoo@neo",
    store_name: "shimadri kirana",
    phone: "9876543210",
    address: "shimadri kirana, Main Market",
    upi_id: "likithsimhadri99@upi",
  }
];

// Authenticate shopkeeper offline
export function loginShopkeeperOffline(
  email: string,
  password?: string
): { success: boolean; shopkeeper?: Shopkeeper; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password?.trim() || "";

  // 1. Check builtin / pre-registered accounts first
  const builtin = BUILTIN_ACCOUNTS.find((s) => s.email.toLowerCase() === cleanEmail);
  if (builtin) {
    if (!builtin.password || builtin.password === cleanPassword || builtin.password.toLowerCase() === cleanPassword.toLowerCase()) {
      initializeStoreProducts(cleanEmail);
      return { success: true, shopkeeper: builtin };
    }
  }

  // 2. Check stored shopkeepers created in app
  const shopkeepers = getStoredShopkeepers();
  const found = shopkeepers.find((s) => s.email.toLowerCase() === cleanEmail);

  if (found) {
    if (!found.password || found.password === cleanPassword || found.password.toLowerCase() === cleanPassword.toLowerCase()) {
      initializeStoreProducts(cleanEmail);
      return { success: true, shopkeeper: found };
    }
  }

  // 3. Fallback demo account
  if (
    cleanEmail === "shopkeeper@example.com" ||
    cleanEmail === "demo" ||
    cleanEmail === "admin"
  ) {
    const demo = BUILTIN_ACCOUNTS[0];
    initializeStoreProducts(cleanEmail);
    return { success: true, shopkeeper: demo };
  }

  return { success: false, error: "Invalid email or password" };
}

// Initialize products for a specific shopkeeper email
export function initializeStoreProducts(email: string) {
  const key = `quantum_products_${email.toLowerCase()}`;
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(DEFAULT_DAILY_PRODUCTS));
  }
}

// Get products for current store
export function getStoreProducts(email?: string): ProductItem[] {
  const storeEmail = (email || "default").toLowerCase();
  const key = `quantum_products_${storeEmail}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {}
  }
  return DEFAULT_DAILY_PRODUCTS;
}

// Save products for current store
export function saveStoreProducts(products: ProductItem[], email?: string) {
  const storeEmail = (email || "default").toLowerCase();
  const key = `quantum_products_${storeEmail}`;
  localStorage.setItem(key, JSON.stringify(products));
}

// Get bills for current store
export function getStoreBills(email?: string): any[] {
  const storeEmail = (email || "default").toLowerCase();
  const key = `quantum_bills_${storeEmail}`;
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

// Add a bill
export function addStoreBill(bill: any, email?: string): any {
  const bills = getStoreBills(email);
  const newBill = {
    ...bill,
    id: bill.id || `INV-${Date.now().toString().slice(-6)}`,
    invoice_number: bill.invoice_number || `INV-${Date.now().toString().slice(-6)}`,
    created_at: new Date().toISOString(),
  };
  bills.unshift(newBill);
  const storeEmail = (email || "default").toLowerCase();
  localStorage.setItem(`quantum_bills_${storeEmail}`, JSON.stringify(bills));
  return newBill;
}

// Customers helpers
export const DEFAULT_CUSTOMERS = [
  { id: 1, name: "Ramesh Sharma", phone: "9876543210", initials: "RS", tone: "violet" },
  { id: 2, name: "Priya Patel", phone: "9812345678", initials: "PP", tone: "blue" },
  { id: 3, name: "Anil Verma", phone: "9988776655", initials: "AV", tone: "green" },
];

export function getStoreCustomers(email?: string): any[] {
  const storeEmail = (email || "default").toLowerCase();
  const key = `quantum_customers_${storeEmail}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {}
  }
  return DEFAULT_CUSTOMERS;
}

export function saveStoreCustomers(customers: any[], email?: string) {
  const storeEmail = (email || "default").toLowerCase();
  const key = `quantum_customers_${storeEmail}`;
  localStorage.setItem(key, JSON.stringify(customers));
}

export function addStoreCustomer(customer: any, email?: string): any {
  const customers = getStoreCustomers(email);
  const newCustomer = {
    id: customer.id || Date.now(),
    name: customer.name || "Customer",
    phone: customer.phone || "",
    initials: customer.initials || (customer.name ? customer.name.substring(0, 2).toUpperCase() : "CU"),
    tone: customer.tone || "violet",
  };
  const updated = [newCustomer, ...customers.filter((c) => c.phone !== newCustomer.phone)];
  saveStoreCustomers(updated, email);
  return newCustomer;
}

// Shopkeeper profile update helper
export function updateShopkeeperProfileOffline(data: any): Shopkeeper {
  const email = (data.current_email || data.email || "").toLowerCase().trim();
  const shopkeepers = getStoredShopkeepers();
  let updatedShopkeeper: Shopkeeper | null = null;

  const updatedList = shopkeepers.map((s) => {
    if (s.email.toLowerCase() === email) {
      updatedShopkeeper = {
        ...s,
        name: data.name || (data as any).shopkeeper_name || s.name,
        store_name: data.store_name || (data as any).storeName || s.store_name,
        phone: data.phone || s.phone,
        address: data.address || s.address,
        upi_id: data.upi_id || s.upi_id,
        ...(data.password ? { password: data.password } : {}),
      };
      return updatedShopkeeper;
    }
    return s;
  });

  if (!updatedShopkeeper) {
    const builtin = BUILTIN_ACCOUNTS.find((s) => s.email.toLowerCase() === email);
    updatedShopkeeper = {
      id: builtin?.id || Date.now(),
      name: data.name || builtin?.name || "Shopkeeper",
      email: email,
      store_name: data.store_name || (data as any).storeName || builtin?.store_name || "Smart Kirana",
      phone: data.phone || builtin?.phone || "9876543210",
      address: data.address || builtin?.address || "Main Market",
      upi_id: data.upi_id || builtin?.upi_id || `${email.split("@")[0]}@upi`,
      ...(data.password ? { password: data.password } : {}),
    };
    updatedList.push(updatedShopkeeper);
  }

  localStorage.setItem("quantum_shopkeepers", JSON.stringify(updatedList));
  localStorage.setItem("quantum_current_shopkeeper", JSON.stringify(updatedShopkeeper));
  return updatedShopkeeper;
}

// Smart Offline Voice Bill Parser
const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  half: 1,
  quarter: 1,
};

export function parseVoiceBillLocally(rawText: string, email?: string): { success: boolean; items: any[]; total_amount: number } {
  if (!rawText || !rawText.trim()) {
    return { success: false, items: [], total_amount: 0 };
  }

  const catalog = getStoreProducts(email);
  let text = rawText.toLowerCase().replace(/[^\w\s,\.]/g, " ");

  // Convert number words to digits
  Object.entries(NUMBER_WORDS).forEach(([word, num]) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    text = text.replace(regex, ` ${num} `);
  });

  // Segment by delimiters or newly starting numbers
  const segmented = text
    .replace(/\b(and|then|plus|also|along with)\b/gi, ",")
    .replace(/([a-z])\s+(\d+)\b/g, "$1 , $2");

  const clauses = segmented
    .split(/[,.]/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const parsedItems: any[] = [];

  for (const clause of clauses) {
    const numMatch = clause.match(/\b(\d+)\b/);
    const quantity = numMatch ? parseInt(numMatch[1], 10) : 1;

    const cleanedPhrase = clause
      .replace(/\b\d+\b/g, " ")
      .replace(
        /\b(packets?|packs?|kg|kgs|kilo|kilos|gm|grams?|liter|liters?|ltr|bottle|bottles?|piece|pieces?|box|boxes?|rupees?|rs|of|the|a|an)\b/gi,
        " "
      )
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanedPhrase) continue;

    let bestMatch: ProductItem | null = null;
    let highestScore = 0;

    const phraseTokens = cleanedPhrase.split(" ").filter((t) => t.length > 1);

    for (const prod of catalog) {
      const prodName = prod.name.toLowerCase();
      let score = 0;

      if (prodName.includes(cleanedPhrase)) {
        score += 10 + cleanedPhrase.length;
      }

      for (const token of phraseTokens) {
        if (prodName.includes(token)) {
          score += 3 + token.length;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = prod;
      }
    }

    if (bestMatch && highestScore >= 3) {
      const unitPrice =
        bestMatch.price ||
        parseInt(bestMatch.value.replace(/[^0-9]/g, ""), 10) ||
        0;

      const existing = parsedItems.find((i) => i.product === bestMatch!.name);
      if (existing) {
        existing.quantity += quantity;
      } else {
        parsedItems.push({
          product: bestMatch.name,
          quantity: quantity,
          unit_price: unitPrice,
          matched_in_db: true,
        });
      }
    } else {
      const capitalized =
        cleanedPhrase.charAt(0).toUpperCase() + cleanedPhrase.slice(1);
      const existing = parsedItems.find((i) => i.product === capitalized);
      if (existing) {
        existing.quantity += quantity;
      } else {
        parsedItems.push({
          product: capitalized,
          quantity: quantity,
          unit_price: 0,
          matched_in_db: false,
        });
      }
    }
  }

  const grandTotal = parsedItems.reduce(
    (acc, curr) => acc + curr.quantity * curr.unit_price,
    0
  );

  return {
    success: parsedItems.length > 0,
    items: parsedItems,
    total_amount: grandTotal,
  };
}
