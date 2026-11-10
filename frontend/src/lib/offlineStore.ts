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
  // 1. Dairy, Milk, Eggs & Breakfast
  { id: 1, name: "Amul Taaza Milk 500ml", value: "₹30", barcode: "8901262010053", color: "bg-blue-500", width: "45%", sold: "0 sold", price: 30, stock: 50 },
  { id: 2, name: "Amul Gold Milk 500ml", value: "₹34", barcode: "8901262010060", color: "bg-amber-500", width: "35%", sold: "0 sold", price: 34, stock: 45 },
  { id: 3, name: "Amul Butter 100g", value: "₹58", barcode: "8901262010015", color: "bg-yellow-500", width: "30%", sold: "0 sold", price: 58, stock: 35 },
  { id: 4, name: "Amul Butter 500g", value: "₹275", barcode: "8901262010022", color: "bg-yellow-600", width: "25%", sold: "0 sold", price: 275, stock: 20 },
  { id: 5, name: "Amul Pure Ghee Tin 1L", value: "₹610", barcode: "8901262030013", color: "bg-amber-600", width: "20%", sold: "0 sold", price: 610, stock: 15 },
  { id: 6, name: "Amul Cheese Slices 200g", value: "₹140", barcode: "8901262020113", color: "bg-yellow-600", width: "15%", sold: "0 sold", price: 140, stock: 25 },
  { id: 7, name: "Harvest White Bread 400g", value: "₹45", barcode: "8901725111221", color: "bg-amber-600", width: "40%", sold: "0 sold", price: 45, stock: 30 },
  { id: 8, name: "English Oven Brown Bread 400g", value: "₹55", barcode: "8901725111238", color: "bg-amber-700", width: "30%", sold: "0 sold", price: 55, stock: 20 },
  { id: 9, name: "Farm Fresh Eggs 6-Pack", value: "₹50", barcode: "8904000100234", color: "bg-orange-500", width: "25%", sold: "0 sold", price: 50, stock: 40 },
  { id: 10, name: "Mother Dairy Curd 400g", value: "₹35", barcode: "8901648001024", color: "bg-sky-500", width: "20%", sold: "0 sold", price: 35, stock: 30 },
  { id: 11, name: "Kelloggs Corn Flakes 250g", value: "₹110", barcode: "8901499008123", color: "bg-rose-500", width: "15%", sold: "0 sold", price: 110, stock: 20 },
  { id: 12, name: "Nestle Everyday Dairy Whitener 400g", value: "₹240", barcode: "8901058891019", color: "bg-blue-600", width: "20%", sold: "0 sold", price: 240, stock: 18 },

  // 2. Staples, Atta, Rice, Dal & Cooking Essentials
  { id: 13, name: "Aashirvaad Shudh Chakki Atta 5kg", value: "₹240", barcode: "8901725121015", color: "bg-amber-700", width: "50%", sold: "0 sold", price: 240, stock: 40 },
  { id: 14, name: "Aashirvaad Select Sharbati Atta 5kg", value: "₹295", barcode: "8901725121022", color: "bg-amber-800", width: "35%", sold: "0 sold", price: 295, stock: 25 },
  { id: 15, name: "Fortune Chakki Fresh Atta 5kg", value: "₹230", barcode: "8906007280045", color: "bg-amber-600", width: "35%", sold: "0 sold", price: 230, stock: 30 },
  { id: 16, name: "Fortune Basmati Rice 1kg", value: "₹120", barcode: "8906007280014", color: "bg-indigo-500", width: "35%", sold: "0 sold", price: 120, stock: 35 },
  { id: 17, name: "Daawat Rozana Super Basmati Rice 5kg", value: "₹450", barcode: "8901537010014", color: "bg-indigo-600", width: "25%", sold: "0 sold", price: 450, stock: 15 },
  { id: 18, name: "India Gate Basmati Rice Feast 1kg", value: "₹95", barcode: "8906001790014", color: "bg-indigo-700", width: "30%", sold: "0 sold", price: 95, stock: 30 },
  { id: 19, name: "Tata Sampann Toor Dal 1kg", value: "₹165", barcode: "8901058853116", color: "bg-yellow-700", width: "25%", sold: "0 sold", price: 165, stock: 25 },
  { id: 20, name: "Tata Sampann Moong Dal 1kg", value: "₹140", barcode: "8901058853123", color: "bg-emerald-600", width: "20%", sold: "0 sold", price: 140, stock: 25 },
  { id: 21, name: "Tata Sampann Chana Dal 1kg", value: "₹115", barcode: "8901058853130", color: "bg-amber-600", width: "25%", sold: "0 sold", price: 115, stock: 25 },
  { id: 22, name: "Tata Sampann Urad Dal 1kg", value: "₹160", barcode: "8901058853147", color: "bg-stone-600", width: "20%", sold: "0 sold", price: 160, stock: 20 },
  { id: 23, name: "Fortune Sunlite Sunflower Oil 1L", value: "₹145", barcode: "8906007280021", color: "bg-amber-500", width: "40%", sold: "0 sold", price: 145, stock: 40 },
  { id: 24, name: "Saffola Gold Pro Healthy Oil 1L", value: "₹165", barcode: "8901088011012", color: "bg-amber-600", width: "30%", sold: "0 sold", price: 165, stock: 30 },
  { id: 25, name: "Dhara Mustard Oil 1L", value: "₹155", barcode: "8901648011030", color: "bg-yellow-600", width: "30%", sold: "0 sold", price: 155, stock: 35 },
  { id: 26, name: "Gemini Sunflower Oil 1L", value: "₹140", barcode: "8906012450013", color: "bg-yellow-500", width: "25%", sold: "0 sold", price: 140, stock: 25 },
  { id: 27, name: "Tata Salt 1kg", value: "₹28", barcode: "8901058852331", color: "bg-cyan-600", width: "60%", sold: "0 sold", price: 28, stock: 60 },
  { id: 28, name: "Pure Refined Sugar 1kg", value: "₹46", barcode: "8901001001001", color: "bg-slate-400", width: "55%", sold: "0 sold", price: 46, stock: 50 },

  // 3. Spices, Masalas, Pickles & Cooking Sauces
  { id: 29, name: "Everest Turmeric Powder 100g", value: "₹34", barcode: "8901786101018", color: "bg-yellow-500", width: "40%", sold: "0 sold", price: 34, stock: 40 },
  { id: 30, name: "Everest Tikhalal Chilli Powder 100g", value: "₹48", barcode: "8901786102015", color: "bg-red-600", width: "40%", sold: "0 sold", price: 48, stock: 40 },
  { id: 31, name: "Everest Coriander Powder 100g", value: "₹38", barcode: "8901786103012", color: "bg-emerald-700", width: "35%", sold: "0 sold", price: 38, stock: 35 },
  { id: 32, name: "Everest Garam Masala 100g", value: "₹85", barcode: "8901786104019", color: "bg-amber-800", width: "30%", sold: "0 sold", price: 85, stock: 30 },
  { id: 33, name: "MDH Chana Masala 100g", value: "₹82", barcode: "8901594101016", color: "bg-orange-700", width: "30%", sold: "0 sold", price: 82, stock: 30 },
  { id: 34, name: "MDH Kitchen King Masala 100g", value: "₹85", barcode: "8901594102013", color: "bg-amber-700", width: "30%", sold: "0 sold", price: 85, stock: 30 },
  { id: 35, name: "MDH Deggi Mirch 100g", value: "₹92", barcode: "8901594103010", color: "bg-rose-700", width: "25%", sold: "0 sold", price: 92, stock: 25 },
  { id: 36, name: "Catch Table Salt Sprinkler 200g", value: "₹35", barcode: "8901192101014", color: "bg-cyan-500", width: "30%", sold: "0 sold", price: 35, stock: 30 },
  { id: 37, name: "Catch Black Pepper Sprinkler 100g", value: "₹95", barcode: "8901192102011", color: "bg-stone-700", width: "25%", sold: "0 sold", price: 95, stock: 25 },
  { id: 38, name: "Maggi Masala-ae-Magic Pack of 10", value: "₹50", barcode: "8901058842059", color: "bg-yellow-600", width: "40%", sold: "0 sold", price: 50, stock: 40 },
  { id: 39, name: "Kissan Fresh Tomato Ketchup 500g", value: "₹120", barcode: "8901030461019", color: "bg-red-600", width: "25%", sold: "0 sold", price: 120, stock: 25 },
  { id: 40, name: "Maggi Rich Tomato Ketchup 500g", value: "₹115", barcode: "8901058871011", color: "bg-rose-600", width: "25%", sold: "0 sold", price: 115, stock: 25 },
  { id: 41, name: "Chings Secret Schezwan Chutney 250g", value: "₹85", barcode: "8901595102012", color: "bg-red-700", width: "30%", sold: "0 sold", price: 85, stock: 30 },

  // 4. Biscuits, Namkeen & Snacks
  { id: 42, name: "Parle-G Gold Biscuits 250g", value: "₹25", barcode: "8901719101016", color: "bg-yellow-500", width: "70%", sold: "0 sold", price: 25, stock: 80 },
  { id: 43, name: "Parle Monaco Salted Crackers 200g", value: "₹35", barcode: "8901719102020", color: "bg-yellow-600", width: "45%", sold: "0 sold", price: 35, stock: 45 },
  { id: 44, name: "Parle Krackjack Biscuits 200g", value: "₹35", barcode: "8901719103010", color: "bg-amber-500", width: "40%", sold: "0 sold", price: 35, stock: 40 },
  { id: 45, name: "Parle Hide & Seek Choco Chip 100g", value: "₹40", barcode: "8901719104055", color: "bg-stone-800", width: "35%", sold: "0 sold", price: 40, stock: 35 },
  { id: 46, name: "Britannia Good Day Butter 100g", value: "₹30", barcode: "8901063012010", color: "bg-blue-600", width: "50%", sold: "0 sold", price: 30, stock: 60 },
  { id: 47, name: "Britannia Good Day Cashew 100g", value: "₹35", barcode: "8901063012027", color: "bg-amber-600", width: "50%", sold: "0 sold", price: 35, stock: 50 },
  { id: 48, name: "Britannia Marie Gold 250g", value: "₹35", barcode: "8901063013024", color: "bg-amber-500", width: "45%", sold: "0 sold", price: 35, stock: 55 },
  { id: 49, name: "Britannia Bourbon Chocolate 120g", value: "₹30", barcode: "8901063014038", color: "bg-stone-700", width: "45%", sold: "0 sold", price: 30, stock: 45 },
  { id: 50, name: "Britannia Little Hearts 75g", value: "₹25", barcode: "8901063015028", color: "bg-rose-500", width: "40%", sold: "0 sold", price: 25, stock: 40 },
  { id: 51, name: "Sunfeast Dark Fantasy Choco Fills 75g", value: "₹40", barcode: "8901725141020", color: "bg-stone-900", width: "35%", sold: "0 sold", price: 40, stock: 35 },
  { id: 52, name: "Oreo Original Vanilla Cream 120g", value: "₹40", barcode: "8901233024041", color: "bg-blue-700", width: "45%", sold: "0 sold", price: 40, stock: 45 },
  { id: 53, name: "Maggi 2-Minute Noodles 4-Pack", value: "₹56", barcode: "8901058842011", color: "bg-yellow-500", width: "65%", sold: "0 sold", price: 56, stock: 60 },
  { id: 54, name: "Sunfeast YiPPee Magic Masala Noodles 240g", value: "₹52", barcode: "8901725151012", color: "bg-orange-600", width: "40%", sold: "0 sold", price: 52, stock: 40 },
  { id: 55, name: "Lays Magic Masala Chips 50g", value: "₹20", barcode: "8901491101021", color: "bg-blue-500", width: "60%", sold: "0 sold", price: 20, stock: 65 },
  { id: 56, name: "Lays Classic Salted Chips 50g", value: "₹20", barcode: "8901491101014", color: "bg-yellow-400", width: "50%", sold: "0 sold", price: 20, stock: 50 },
  { id: 57, name: "Lays Spanish Tomato Tango 50g", value: "₹20", barcode: "8901491101038", color: "bg-red-500", width: "50%", sold: "0 sold", price: 20, stock: 50 },
  { id: 58, name: "Kurkure Masala Munch 82g", value: "₹20", barcode: "8901491001086", color: "bg-orange-500", width: "60%", sold: "0 sold", price: 20, stock: 60 },
  { id: 59, name: "Haldirams Nagpur Aloo Bhujia 150g", value: "₹45", barcode: "8904004400477", color: "bg-amber-600", width: "50%", sold: "0 sold", price: 45, stock: 50 },
  { id: 60, name: "Haldirams Bhujia Sev 200g", value: "₹55", barcode: "8904004401030", color: "bg-yellow-600", width: "40%", sold: "0 sold", price: 55, stock: 40 },
  { id: 61, name: "Haldirams Khatta Meetha 200g", value: "₹55", barcode: "8904004401047", color: "bg-orange-600", width: "35%", sold: "0 sold", price: 55, stock: 35 },

  // 5. Beverages, Tea, Coffee & Cold Drinks
  { id: 62, name: "Tata Tea Premium 500g", value: "₹250", barcode: "8901058851013", color: "bg-emerald-700", width: "35%", sold: "0 sold", price: 250, stock: 30 },
  { id: 63, name: "Red Label Tea 250g", value: "₹135", barcode: "8901030383014", color: "bg-rose-600", width: "30%", sold: "0 sold", price: 135, stock: 35 },
  { id: 64, name: "Taj Mahal Tea 250g", value: "₹190", barcode: "8901030384028", color: "bg-blue-800", width: "20%", sold: "0 sold", price: 190, stock: 20 },
  { id: 65, name: "Wagh Bakri CTC Tea 500g", value: "₹270", barcode: "8906001020012", color: "bg-emerald-800", width: "25%", sold: "0 sold", price: 270, stock: 25 },
  { id: 66, name: "Nescafe Classic Coffee 50g", value: "₹185", barcode: "8901058862019", color: "bg-amber-900", width: "20%", sold: "0 sold", price: 185, stock: 30 },
  { id: 67, name: "BRU Instant Coffee 50g", value: "₹120", barcode: "8901030372018", color: "bg-yellow-800", width: "25%", sold: "0 sold", price: 120, stock: 25 },
  { id: 68, name: "Cadbury Bournvita 500g", value: "₹245", barcode: "8901233031025", color: "bg-orange-700", width: "20%", sold: "0 sold", price: 245, stock: 20 },
  { id: 69, name: "Horlicks Classic Malt 500g", value: "₹260", barcode: "8901571001018", color: "bg-blue-600", width: "20%", sold: "0 sold", price: 260, stock: 20 },
  { id: 70, name: "Coca-Cola Bottle 750ml", value: "₹40", barcode: "8901764012237", color: "bg-red-600", width: "45%", sold: "0 sold", price: 40, stock: 45 },
  { id: 71, name: "Thums Up Bottle 750ml", value: "₹40", barcode: "8901764022236", color: "bg-blue-900", width: "50%", sold: "0 sold", price: 40, stock: 50 },
  { id: 72, name: "Sprite Bottle 750ml", value: "₹40", barcode: "8901764032235", color: "bg-emerald-600", width: "40%", sold: "0 sold", price: 40, stock: 40 },
  { id: 73, name: "Maaza Mango Drink 600ml", value: "₹42", barcode: "8901764041214", color: "bg-amber-500", width: "45%", sold: "0 sold", price: 42, stock: 45 },
  { id: 74, name: "Frooti Mango Drink 160ml", value: "₹15", barcode: "8902579103028", color: "bg-yellow-500", width: "60%", sold: "0 sold", price: 15, stock: 60 },
  { id: 75, name: "Bisleri Mineral Water 1L", value: "₹20", barcode: "8906014400122", color: "bg-teal-500", width: "80%", sold: "0 sold", price: 20, stock: 80 },
  { id: 76, name: "Kinley Mineral Water 1L", value: "₹20", barcode: "8901764051015", color: "bg-cyan-600", width: "60%", sold: "0 sold", price: 20, stock: 60 },

  // 6. Chocolates & Confectionery
  { id: 77, name: "Cadbury Dairy Milk Chocolate 50g", value: "₹45", barcode: "8901233010020", color: "bg-purple-700", width: "60%", sold: "0 sold", price: 45, stock: 60 },
  { id: 78, name: "Cadbury 5 Star Bar 40g", value: "₹20", barcode: "8901233012017", color: "bg-amber-700", width: "50%", sold: "0 sold", price: 20, stock: 50 },
  { id: 79, name: "Nestle KitKat 4-Finger 38g", value: "₹30", barcode: "8901058863023", color: "bg-red-600", width: "50%", sold: "0 sold", price: 30, stock: 50 },
  { id: 80, name: "Nestle Munch Crunchy Bar 25g", value: "₹10", barcode: "8901058864013", color: "bg-blue-600", width: "70%", sold: "0 sold", price: 10, stock: 70 },
  { id: 81, name: "Cadbury Dairy Milk Silk 60g", value: "₹80", barcode: "8901233013014", color: "bg-purple-800", width: "30%", sold: "0 sold", price: 80, stock: 30 },
  { id: 82, name: "Cadbury Gems Surprise Ball 23g", value: "₹25", barcode: "8901233014011", color: "bg-indigo-600", width: "40%", sold: "0 sold", price: 25, stock: 40 },

  // 7. Soaps, Oral, Hair & Personal Care
  { id: 83, name: "Dettol Original Soap 75g", value: "₹38", barcode: "8901396112012", color: "bg-emerald-600", width: "40%", sold: "0 sold", price: 38, stock: 50 },
  { id: 84, name: "Lifebuoy Total Soap 125g", value: "₹36", barcode: "8901030391026", color: "bg-rose-500", width: "35%", sold: "0 sold", price: 36, stock: 45 },
  { id: 85, name: "Dove Cream Beauty Bar 100g", value: "₹68", barcode: "8901030392023", color: "bg-blue-400", width: "35%", sold: "0 sold", price: 68, stock: 35 },
  { id: 86, name: "Lux Velvet Glow Rose Soap 100g", value: "₹42", barcode: "8901030393013", color: "bg-pink-500", width: "40%", sold: "0 sold", price: 42, stock: 40 },
  { id: 87, name: "Pears Pure & Gentle Soap 125g", value: "₹75", barcode: "8901030394010", color: "bg-amber-500", width: "30%", sold: "0 sold", price: 75, stock: 30 },
  { id: 88, name: "Cinthol Original Deodorant Soap 100g", value: "₹45", barcode: "8901023011016", color: "bg-red-600", width: "35%", sold: "0 sold", price: 45, stock: 35 },
  { id: 89, name: "Colgate Strong Teeth 100g", value: "₹62", barcode: "8901314010014", color: "bg-rose-600", width: "45%", sold: "0 sold", price: 62, stock: 50 },
  { id: 90, name: "Close Up Red Hot Gel 80g", value: "₹55", barcode: "8901030401015", color: "bg-red-600", width: "25%", sold: "0 sold", price: 55, stock: 40 },
  { id: 91, name: "Dabur Red Ayurvedic Toothpaste 150g", value: "₹75", barcode: "8901207011015", color: "bg-red-700", width: "35%", sold: "0 sold", price: 75, stock: 35 },
  { id: 92, name: "Sensodyne Fresh Mint Toothpaste 75g", value: "₹145", barcode: "8901571011017", color: "bg-blue-600", width: "25%", sold: "0 sold", price: 145, stock: 25 },
  { id: 93, name: "Clinic Plus Shampoo 175ml", value: "₹110", barcode: "8901030412011", color: "bg-blue-600", width: "30%", sold: "0 sold", price: 110, stock: 35 },
  { id: 94, name: "Head & Shoulders Shampoo 180ml", value: "₹175", barcode: "8901314510026", color: "bg-sky-700", width: "20%", sold: "0 sold", price: 175, stock: 25 },
  { id: 95, name: "Parachute 100% Coconut Hair Oil 200ml", value: "₹85", barcode: "8901088021011", color: "bg-blue-500", width: "45%", sold: "0 sold", price: 85, stock: 45 },
  { id: 96, name: "Dabur Amla Hair Oil 180ml", value: "₹95", barcode: "8901207021014", color: "bg-emerald-700", width: "35%", sold: "0 sold", price: 95, stock: 35 },
  { id: 97, name: "Lifebuoy Handwash Refill 185ml", value: "₹45", barcode: "8901030431012", color: "bg-rose-600", width: "40%", sold: "0 sold", price: 45, stock: 40 },
  { id: 98, name: "Dettol Liquid Handwash Pump 200ml", value: "₹99", barcode: "8901396121014", color: "bg-emerald-600", width: "30%", sold: "0 sold", price: 99, stock: 30 },
  { id: 99, name: "Dettol Antiseptic Liquid 125ml", value: "₹88", barcode: "8901396131013", color: "bg-amber-600", width: "30%", sold: "0 sold", price: 88, stock: 30 },
  { id: 100, name: "Savlon Antiseptic Liquid 100ml", value: "₹42", barcode: "8901725161011", color: "bg-orange-600", width: "30%", sold: "0 sold", price: 42, stock: 30 },
  { id: 101, name: "Vaseline Petroleum Jelly 42g", value: "₹45", barcode: "8901030491016", color: "bg-blue-500", width: "35%", sold: "0 sold", price: 45, stock: 35 },
  { id: 102, name: "Nivea Creme Moisturizer 100ml", value: "₹140", barcode: "8904256001017", color: "bg-blue-700", width: "25%", sold: "0 sold", price: 140, stock: 25 },

  // 8. Household & Cleaning
  { id: 103, name: "Surf Excel Easy Wash Detergent 1kg", value: "₹135", barcode: "8901030022012", color: "bg-indigo-600", width: "45%", sold: "0 sold", price: 135, stock: 40 },
  { id: 104, name: "Ariel Matic Front Load Detergent 1kg", value: "₹240", barcode: "8901314810010", color: "bg-blue-700", width: "25%", sold: "0 sold", price: 240, stock: 25 },
  { id: 105, name: "Tide Plus Extra Power Detergent 1kg", value: "₹125", barcode: "8901314820019", color: "bg-orange-500", width: "35%", sold: "0 sold", price: 125, stock: 35 },
  { id: 106, name: "Rin Detergent Bar 250g", value: "₹20", barcode: "8901030031014", color: "bg-blue-700", width: "50%", sold: "0 sold", price: 20, stock: 60 },
  { id: 107, name: "Wheel 2in1 Detergent Powder 1kg", value: "₹72", barcode: "8901030041013", color: "bg-emerald-600", width: "40%", sold: "0 sold", price: 72, stock: 40 },
  { id: 108, name: "Comfort Fabric Conditioner 220ml", value: "₹65", barcode: "8901030051012", color: "bg-sky-500", width: "30%", sold: "0 sold", price: 65, stock: 30 },
  { id: 109, name: "Vim Dishwash Gel 250ml", value: "₹55", barcode: "8901030421013", color: "bg-lime-600", width: "40%", sold: "0 sold", price: 55, stock: 45 },
  { id: 110, name: "Vim Lemon Dishwash Bar 135g", value: "₹10", barcode: "8901030422010", color: "bg-lime-500", width: "75%", sold: "0 sold", price: 10, stock: 75 },
  { id: 111, name: "Pril Dishwashing Liquid Lime 225ml", value: "₹55", barcode: "8901399011015", color: "bg-emerald-500", width: "35%", sold: "0 sold", price: 55, stock: 35 },
  { id: 112, name: "Harpic Power Plus 500ml", value: "₹95", barcode: "8901396211029", color: "bg-rose-700", width: "30%", sold: "0 sold", price: 95, stock: 40 },
  { id: 113, name: "Colin Glass Cleaner 500ml", value: "₹105", barcode: "8901396221011", color: "bg-cyan-500", width: "30%", sold: "0 sold", price: 105, stock: 30 },
  { id: 114, name: "Lizol Floor Cleaner 500ml", value: "₹110", barcode: "8901396231010", color: "bg-red-500", width: "35%", sold: "0 sold", price: 110, stock: 35 },
  { id: 115, name: "Good Knight Gold Flash Refill 45ml", value: "₹82", barcode: "8901023021015", color: "bg-red-600", width: "40%", sold: "0 sold", price: 82, stock: 40 },
  { id: 116, name: "All Out Ultra Mosquito Refill 45ml", value: "₹80", barcode: "8901198011010", color: "bg-blue-600", width: "35%", sold: "0 sold", price: 80, stock: 35 },
  { id: 117, name: "Odonil Room Air Freshener 50g", value: "₹55", barcode: "8901207031013", color: "bg-purple-600", width: "35%", sold: "0 sold", price: 55, stock: 35 },

  // 9. Fresh Daily Vegetables & Produce
  { id: 118, name: "Fresh Onions 1kg", value: "₹35", barcode: "8900000000018", color: "bg-purple-600", width: "70%", sold: "0 sold", price: 35, stock: 90 },
  { id: 119, name: "Fresh Potatoes 1kg", value: "₹30", barcode: "8900000000025", color: "bg-amber-600", width: "75%", sold: "0 sold", price: 30, stock: 100 },
  { id: 120, name: "Fresh Tomatoes 1kg", value: "₹40", barcode: "8900000000032", color: "bg-rose-500", width: "65%", sold: "0 sold", price: 40, stock: 80 },
  { id: 121, name: "Fresh Green Chillies 250g", value: "₹20", barcode: "8900000000049", color: "bg-emerald-500", width: "50%", sold: "0 sold", price: 20, stock: 50 },
  { id: 122, name: "Fresh Ginger 250g", value: "₹30", barcode: "8900000000056", color: "bg-amber-700", width: "45%", sold: "0 sold", price: 30, stock: 45 },
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

  const existingIdx = shopkeepers.findIndex((s) => s.email.toLowerCase() === cleanEmail);
  if (existingIdx !== -1) {
    // Update existing shopkeeper with new credentials
    shopkeepers[existingIdx] = {
      ...shopkeepers[existingIdx],
      name: data.name.trim() || shopkeepers[existingIdx].name,
      password: data.password?.trim() || shopkeepers[existingIdx].password,
      store_name: data.store_name.trim() || shopkeepers[existingIdx].store_name,
    };
    localStorage.setItem("quantum_shopkeepers", JSON.stringify(shopkeepers));
    initializeStoreProducts(cleanEmail);
    return { success: true, shopkeeper: shopkeepers[existingIdx] };
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

  const matchAccount = (s: Shopkeeper) => {
    const emailMatch = s.email.toLowerCase() === cleanEmail;
    const phoneMatch = s.phone && s.phone.trim() === cleanEmail;
    const storeMatch = s.store_name && s.store_name.toLowerCase().trim() === cleanEmail;
    if (!emailMatch && !phoneMatch && !storeMatch) return false;

    // Check password
    if (!s.password || !cleanPassword) return true;
    return (
      s.password.trim() === cleanPassword ||
      s.password.trim().toLowerCase() === cleanPassword.toLowerCase()
    );
  };

  // 1. Check stored shopkeepers created in app (newly registered shops)
  const shopkeepers = getStoredShopkeepers();
  const found = shopkeepers.find(matchAccount);
  if (found) {
    initializeStoreProducts(found.email);
    return { success: true, shopkeeper: found };
  }

  // 2. Check builtin / pre-registered accounts
  const builtin = BUILTIN_ACCOUNTS.find(matchAccount);
  if (builtin) {
    initializeStoreProducts(builtin.email);
    return { success: true, shopkeeper: builtin };
  }

  // 3. Fallback demo account
  if (
    cleanEmail === "shopkeeper@example.com" ||
    cleanEmail === "demo" ||
    cleanEmail === "admin"
  ) {
    const demo = BUILTIN_ACCOUNTS[0];
    initializeStoreProducts(demo.email);
    return { success: true, shopkeeper: demo };
  }

  return { success: false, error: "Invalid email or password" };
}

// Initialize products for a specific shopkeeper email
export function initializeStoreProducts(email: string) {
  const key = `quantum_products_${email.toLowerCase()}`;
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(DEFAULT_DAILY_PRODUCTS));
  } else {
    // If store already has products, merge newly added default products (by barcode/name)
    getStoreProducts(email);
  }
}

// Get products for current store (with seamless auto-sync for newly added catalog barcodes)
export function getStoreProducts(email?: string): ProductItem[] {
  const storeEmail = (email || "default").toLowerCase();
  const key = `quantum_products_${storeEmail}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed: ProductItem[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Auto-merge any new barcode catalog items from DEFAULT_DAILY_PRODUCTS that aren't present yet
        const existingBarcodes = new Set(
          parsed.map((p) => (p.barcode ? p.barcode.trim() : "")).filter(Boolean)
        );
        const existingNames = new Set(
          parsed.map((p) => (p.name ? p.name.trim().toLowerCase() : "")).filter(Boolean)
        );

        let hasNew = false;
        const merged = [...parsed];

        for (const defProd of DEFAULT_DAILY_PRODUCTS) {
          const b = (defProd.barcode || "").trim();
          const n = (defProd.name || "").trim().toLowerCase();
          const barcodeMissing = b && !existingBarcodes.has(b);
          const nameMissing = n && !existingNames.has(n);

          if (barcodeMissing && nameMissing) {
            merged.push(defProd);
            existingBarcodes.add(b);
            existingNames.add(n);
            hasNew = true;
          }
        }

        if (hasNew) {
          localStorage.setItem(key, JSON.stringify(merged));
        }
        return merged;
      }
    } catch {}
  }

  // First time initialization
  try {
    localStorage.setItem(key, JSON.stringify(DEFAULT_DAILY_PRODUCTS));
  } catch {}
  return DEFAULT_DAILY_PRODUCTS;
}

// Save products for current store
export function saveStoreProducts(products: ProductItem[], email?: string) {
  const storeEmail = (email || "default").toLowerCase();
  const key = `quantum_products_${storeEmail}`;
  localStorage.setItem(key, JSON.stringify(products));
}

// Helper to safely parse rupee/currency amount
export function parseAmount(val: any): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Get bills for current store
export function getStoreBills(email?: string): any[] {
  const storeEmail = (email || "default").toLowerCase().trim();
  const key = `quantum_bills_${storeEmail}`;
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

// Add or update a bill in offline store
export function addStoreBill(bill: any, email?: string): any {
  const bills = getStoreBills(email);
  const invoiceNum = bill.invoice || bill.invoice_number || `INV-${Date.now().toString().slice(-6)}`;
  
  const _createdAt = bill.created_at || new Date().toISOString();
  const _createdDate = new Date(_createdAt);
  const _timeDisplay = (!bill.time || bill.time === "Just now")
    ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).format(_createdDate)
    : bill.time;

  const newBill = {
    ...bill,
    id: bill.id || invoiceNum,
    invoice: invoiceNum,
    invoice_number: invoiceNum,
    amount: bill.amount ? String(bill.amount) : "₹0",
    created_at: _createdAt,
    time: _timeDisplay,
  };

  const existingIdx = bills.findIndex(
    (b: any) => (b.invoice && b.invoice === invoiceNum) || (b.id && b.id === newBill.id)
  );

  if (existingIdx >= 0) {
    bills[existingIdx] = { ...bills[existingIdx], ...newBill };
  } else {
    bills.unshift(newBill);
  }

  const storeEmail = (email || "default").toLowerCase().trim();
  localStorage.setItem(`quantum_bills_${storeEmail}`, JSON.stringify(bills));

  // Dynamically update product sold counts in store catalog
  if (Array.isArray(newBill.items) && newBill.items.length > 0) {
    try {
      const storeProducts = getStoreProducts(storeEmail);
      let catalogChanged = false;
      for (const item of newBill.items) {
        const itemPName = (item.product || item.name || "").trim().toLowerCase();
        const itemQty = Number(item.quantity || item.qty || 1);
        if (itemPName) {
          const match = storeProducts.find((p) => 
            p.name.toLowerCase().includes(itemPName) || itemPName.includes(p.name.toLowerCase())
          );
          if (match) {
            const curSold = parseInt(String(match.sold || "0").replace(/[^0-9]/g, ""), 10) || 0;
            match.sold = `${curSold + itemQty} sold`;
            catalogChanged = true;
          }
        }
      }
      if (catalogChanged) {
        saveStoreProducts(storeProducts, storeEmail);
      }
    } catch (e) {
      console.warn("Could not update catalog sold counts:", e);
    }
  }

  // Dispatch a custom event so same-tab listeners (like the dashboard) can react immediately
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("qbill-bill-added", { detail: { email: storeEmail } }));
  }

  return newBill;
}

// Delete a bill from offline store by invoice number or id
export function deleteStoreBill(invoiceOrId: string, email?: string): boolean {
  const bills = getStoreBills(email);
  const before = bills.length;
  const filtered = bills.filter((b: any) =>
    b.invoice !== invoiceOrId &&
    b.invoice_number !== invoiceOrId &&
    String(b.id) !== String(invoiceOrId)
  );

  if (filtered.length === before) return false; // nothing removed

  const storeEmail = (email || "default").toLowerCase().trim();
  localStorage.setItem(`quantum_bills_${storeEmail}`, JSON.stringify(filtered));

  // Notify dashboard to refresh
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("qbill-bill-added", { detail: { email: storeEmail } }));
  }

  return true;
}

// Clear all bills from offline store
export function clearAllStoreBills(email?: string): void {
  const storeEmail = (email || "default").toLowerCase().trim();
  localStorage.setItem(`quantum_bills_${storeEmail}`, JSON.stringify([]));

  // Notify dashboard to refresh
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("qbill-bill-added", { detail: { email: storeEmail } }));
  }
}

/**
 * Collect a partial or full payment against a Pending bill.
 * Updates the bill's remaining amount and status in localStorage.
 * Returns the updated bill.
 */
export function collectPartialBillPayment(
  invoiceOrId: string,
  amountPaid: number,
  paymentMode: "Cash" | "UPI",
  email?: string
): any | null {
  const storeEmail = (email || "default").toLowerCase().trim();
  const bills = getStoreBills(storeEmail);

  const idx = bills.findIndex(
    (b: any) =>
      b.invoice === invoiceOrId ||
      b.invoice_number === invoiceOrId ||
      String(b.id) === String(invoiceOrId)
  );
  if (idx === -1) return null;

  const bill = bills[idx];
  const originalAmountStr = String(bill.amount || "0").replace(/[₹,]/g, "").trim();
  const originalAmount = parseFloat(originalAmountStr) || 0;
  const remaining = Math.max(0, originalAmount - amountPaid);

  const updatedBill = {
    ...bill,
    amount: `₹${remaining}`,
    amount_paid: (parseFloat(String(bill.amount_paid || "0").replace(/[₹,]/g, "")) || 0) + amountPaid,
    original_amount: bill.original_amount || `₹${originalAmount}`,
    status: remaining <= 0 ? "Paid" : "Pending",
    payment_mode: remaining <= 0 ? paymentMode : bill.payment_mode,
    tone: remaining <= 0 ? "emerald" : "amber",
    partial_payment_note: `Paid ₹${amountPaid} via ${paymentMode} at ${new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date())}`,
  };

  bills[idx] = updatedBill;
  localStorage.setItem(`quantum_bills_${storeEmail}`, JSON.stringify(bills));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("qbill-bill-added", { detail: { email: storeEmail } }));
  }

  return updatedBill;
}

// Helper to calculate live top-selling products from actual store bills
export function computeTopSellingProducts(bills: any[], catalogProducts: ProductItem[] = []): ProductItem[] {
  const products = catalogProducts && catalogProducts.length > 0 ? [...catalogProducts] : DEFAULT_DAILY_PRODUCTS;
  
  // Aggregate sales from all bills
  const salesMap: Record<string, number> = {};

  for (const bill of bills) {
    let items = bill.items;
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {}
    }
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const pName = (item.product || item.name || "").trim().toLowerCase();
        const qty = Number(item.quantity || item.qty || 1);
        if (pName) {
          salesMap[pName] = (salesMap[pName] || 0) + (isNaN(qty) ? 1 : qty);
        }
      }
    }
  }

  const colors = [
    "bg-blue-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-orange-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];

  const ranked = products.map((prod, idx) => {
    const prodNameLower = prod.name.trim().toLowerCase();
    
    // Sum matching sales from bills
    let soldFromBills = 0;
    for (const [sName, qty] of Object.entries(salesMap)) {
      if (sName.includes(prodNameLower) || prodNameLower.includes(sName)) {
        soldFromBills += qty;
      }
    }

    // Also parse existing sold count from catalog if present
    const existingSold = parseInt(String(prod.sold || "0").replace(/[^0-9]/g, ""), 10) || 0;
    const finalSold = Math.max(soldFromBills, existingSold);

    return {
      ...prod,
      soldCount: finalSold,
      sold: `${finalSold} sold`,
      color: prod.color || colors[idx % colors.length],
    };
  });

  // Sort by highest sold count first
  ranked.sort((a, b) => b.soldCount - a.soldCount);

  const maxSold = Math.max(1, ...ranked.map((p) => p.soldCount));

  return ranked.slice(0, 5).map((p, idx) => ({
    ...p,
    color: colors[idx % colors.length],
    width: p.soldCount > 0 ? `${Math.max(15, Math.round((p.soldCount / maxSold) * 100))}%` : "0%",
  }));
}

// Calculate dashboard analytics from bills
export function computeDashboardStats(bills: any[], products: any[] = [], customers: any[] = []) {
  const totalBills = bills.length;
  let totalRevenue = 0;
  let todayRevenue = 0;

  const today = new Date();
  const todayDateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

  const hourMap: Record<string, number> = {
    "9 AM": 0,
    "12 PM": 0,
    "3 PM": 0,
    "6 PM": 0,
    "9 PM": 0,
  };

  const dayBuckets: { day: string; dateStr: string; value: number }[] = [];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split("T")[0];
    dayBuckets.push({
      day: daysOfWeek[d.getDay()],
      dateStr: dStr,
      value: 0,
    });
  }

  for (const b of bills) {
    const amt = parseAmount(b.amount || b.total || 0);
    totalRevenue += amt;

    const bDate = b.created_at ? new Date(b.created_at) : today;
    const bDateStr = !isNaN(bDate.getTime()) ? bDate.toISOString().split("T")[0] : todayDateStr;

    if (bDateStr === todayDateStr) {
      todayRevenue += amt;
      const hour = !isNaN(bDate.getTime()) ? bDate.getHours() : 12;
      if (hour < 11) hourMap["9 AM"] += amt;
      else if (hour < 14) hourMap["12 PM"] += amt;
      else if (hour < 17) hourMap["3 PM"] += amt;
      else if (hour < 20) hourMap["6 PM"] += amt;
      else hourMap["9 PM"] += amt;
    }

    const matchDay = dayBuckets.find((db) => db.dateStr === bDateStr);
    if (matchDay) {
      matchDay.value += amt;
    } else if (dayBuckets.length > 0) {
      dayBuckets[dayBuckets.length - 1].value += amt;
    }
  }

  // Fallback distribution for charts if hours didn't catch
  if (todayRevenue > 0 && Object.values(hourMap).every((v) => v === 0)) {
    hourMap["12 PM"] = Math.round(todayRevenue * 0.4);
    hourMap["6 PM"] = Math.round(todayRevenue * 0.6);
  }

  const bucketSum = dayBuckets.reduce((s, b) => s + b.value, 0);
  if (totalRevenue > 0 && bucketSum === 0) {
    dayBuckets[dayBuckets.length - 1].value = totalRevenue;
  }

  const salesByHour = Object.entries(hourMap).map(([hour, sales]) => ({ hour, sales }));
  const revenueTrend = dayBuckets.map(({ day, value }) => ({ day, value, revenue: value }));

  const lowStockItems = products.filter((p) => {
    const s = p.stock !== undefined ? p.stock : (p.name.includes("Milk") || p.name.includes("Bread") || p.name.includes("Eggs") || p.name.includes("Curd") ? 3 : 20);
    return s <= 5;
  });

  const summaryStats = {
    todaySales: `₹${todayRevenue.toLocaleString("en-IN")}`,
    todaySalesMeta: totalBills > 0 ? (todayRevenue > 0 ? "Updated just now" : "No sales today yet") : "No sales today",
    billsGenerated: totalBills,
    billsGeneratedMeta: totalBills > 0 ? `${totalBills} invoices to date` : "No bills yet",
    totalCustomers: Math.max(customers.length, new Set(bills.map((b) => b.customer).filter(Boolean)).size),
    totalCustomersMeta: `${Math.max(customers.length, new Set(bills.map((b) => b.customer).filter(Boolean)).size)} registered`,
    totalProducts: products.length,
    totalProductsMeta: `${products.length} in catalog`,
    lowStock: lowStockItems.length,
    lowStockMeta: lowStockItems.length > 0 ? `${lowStockItems.length} items low` : "All in stock",
    monthlyRevenue: `₹${totalRevenue.toLocaleString("en-IN")}`,
    monthlyRevenueMeta: "Current month",
    voiceBillsToday: totalBills,
    accuracy: "99%",
  };

  const topProducts = computeTopSellingProducts(bills, products);

  return { summaryStats, salesByHour, revenueTrend, topProducts };
}


// Customers helpers
export const DEFAULT_CUSTOMERS: any[] = [];

export function getStoreCustomers(email?: string): any[] {
  const storeEmail = (email || "default").toLowerCase();
  const key = `quantum_customers_${storeEmail}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter((c: any) => {
          const n = (c.name || "").toLowerCase();
          return !n.includes("ramesh sharma") && !n.includes("priya patel");
        });
      }
    } catch {}
  }
  return [];
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

// Digital Khata (Udhar Ledger) Offline Helpers
export interface KhataEntry {
  id: string | number;
  customerName: string;
  customerPhone: string;
  amount: number;
  entryType: 'GIVEN' | 'RECEIVED'; // GIVEN = Udhar given, RECEIVED = Payment collected
  note?: string;
  billInvoice?: string;
  items?: any[];
  date: string;
}

export interface PayLaterVisit {
  id: string | number;
  invoice: string;
  dateTime: string;
  date: string;
  time: string;
  amount: number;
  items: Array<{
    product: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  note?: string;
}

export interface PayLaterCustomer {
  customerName: string;
  customerPhone: string;
  totalDue: number;
  totalGiven: number;
  totalRepaid: number;
  lastDate: string;
  visitCount: number;
  visits: PayLaterVisit[];
  repayments: Array<{
    amount: number;
    dateTime: string;
    note?: string;
  }>;
}

export const DEFAULT_KHATA_ENTRIES: KhataEntry[] = [];

export function getStoreKhata(email?: string): KhataEntry[] {
  const storeEmail = (email || "default").toLowerCase();
  const key = `quantum_khata_${storeEmail}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed: KhataEntry[] = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Filter out any legacy dummy/demo entries so only real live bills from now onwards appear
        const liveOnly = parsed.filter((p) => {
          const name = (p.customerName || "").toLowerCase();
          const inv = (p.billInvoice || "").toUpperCase();
          const isMock =
            name.includes("ramesh sharma") ||
            name.includes("priya patel") ||
            inv === "INV-5120" ||
            inv === "INV-5125" ||
            inv === "INV-5188";
          return !isMock;
        });

        // If mock entries were filtered out, save clean live data
        if (liveOnly.length !== parsed.length) {
          localStorage.setItem(key, JSON.stringify(liveOnly));
        }
        return liveOnly;
      }
    } catch {}
  }
  return [];
}

export function purgeLegacyKhataHistory(email?: string) {
  if (typeof window === "undefined") return;
  const storeEmail = (email || "default").toLowerCase().trim();
  const flagKey = `quantum_khata_purged_live_v6_${storeEmail}`;
  if (!localStorage.getItem(flagKey)) {
    // Purge old khata storage
    localStorage.setItem(`quantum_khata_${storeEmail}`, JSON.stringify([]));
    localStorage.setItem("quantum_khata_default", JSON.stringify([]));

    // Clear mock customers
    try {
      const custKey = `quantum_customers_${storeEmail}`;
      const custs = JSON.parse(localStorage.getItem(custKey) || "[]");
      if (Array.isArray(custs)) {
        const liveCusts = custs.filter((c: any) => {
          const n = (c.name || "").toLowerCase();
          return !n.includes("ramesh sharma") && !n.includes("priya patel");
        });
        localStorage.setItem(custKey, JSON.stringify(liveCusts));
      }
    } catch {}

    // Settle/remove old test credit bills
    try {
      const billsKey = `quantum_bills_${storeEmail}`;
      const stored = localStorage.getItem(billsKey);
      if (stored) {
        const bills = JSON.parse(stored);
        if (Array.isArray(bills)) {
          const cleaned = bills.filter((b: any) => {
            const cust = (b.customer || "").toLowerCase();
            const inv = (b.invoice || b.invoice_number || "").toUpperCase();
            const isMock = cust.includes("ramesh sharma") || cust.includes("priya patel") || inv === "INV-5120" || inv === "INV-5125" || inv === "INV-5188";
            return !isMock;
          }).map((b: any) => {
            if (b.payment_mode === "Credit" || b.status === "Pending" || b.payment_mode === "Udhar" || b.status === "Udhar") {
              return { ...b, payment_mode: "Cash", status: "Paid" };
            }
            return b;
          });
          localStorage.setItem(billsKey, JSON.stringify(cleaned));
        }
      }
    } catch {}

    localStorage.setItem(flagKey, "true");
  }
}

export function clearStoreKhata(email?: string) {
  const storeEmail = (email || "default").toLowerCase();
  const key = `quantum_khata_${storeEmail}`;
  localStorage.setItem(key, JSON.stringify([]));
  localStorage.setItem("quantum_khata_default", JSON.stringify([]));

  // Also clean any demo credit bills or mark pending bills as settled
  try {
    const billsKey = `quantum_bills_${storeEmail}`;
    const storedBills = JSON.parse(localStorage.getItem(billsKey) || "[]");
    if (Array.isArray(storedBills)) {
      const cleanBills = storedBills
        .filter((b: any) => {
          const inv = (b.invoice || b.invoice_number || "").toUpperCase();
          const cust = (b.customer || "").toLowerCase();
          return (
            inv !== "INV-5120" &&
            inv !== "INV-5125" &&
            inv !== "INV-5188" &&
            !cust.includes("ramesh sharma") &&
            !cust.includes("priya patel")
          );
        })
        .map((b: any) => {
          if (
            b.payment_mode === "Credit" ||
            b.status === "Pending" ||
            b.payment_mode === "Udhar" ||
            b.status === "Udhar"
          ) {
            return { ...b, payment_mode: "Cash", status: "Paid" };
          }
          return b;
        });
      localStorage.setItem(billsKey, JSON.stringify(cleanBills));
    }
  } catch {}

  // Also call backend to delete if reachable
  try {
    fetch("/api/khata/", { method: "DELETE" }).catch(() => {});
  } catch {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("qbill-bill-added", { detail: { email: storeEmail } }));
  }
}

export function saveStoreKhata(entries: KhataEntry[], email?: string) {
  const storeEmail = (email || "default").toLowerCase();
  const key = `quantum_khata_${storeEmail}`;
  localStorage.setItem(key, JSON.stringify(entries));
}

export function recordKhataTransaction(entry: {
  customerName: string;
  customerPhone: string;
  amount: number;
  entryType: 'GIVEN' | 'RECEIVED';
  note?: string;
  billInvoice?: string;
  items?: any[];
}, email?: string): KhataEntry {
  const list = getStoreKhata(email);
  const newEntry: KhataEntry = {
    id: Date.now(),
    customerName: entry.customerName.trim() || "Customer",
    customerPhone: entry.customerPhone.trim(),
    amount: Math.abs(entry.amount),
    entryType: entry.entryType,
    note: entry.note || "",
    billInvoice: entry.billInvoice || "",
    items: entry.items || [],
    date: new Date().toISOString(),
  };

  const updated = [newEntry, ...list];
  saveStoreKhata(updated, email);

  if (entry.customerPhone) {
    addStoreCustomer({
      name: entry.customerName,
      phone: entry.customerPhone,
    }, email);
  }

  // Notify listeners to update dashboard
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("qbill-bill-added", { detail: { email } }));
  }

  return newEntry;
}

// Retrieve structured Pay Later breakdown for every customer with multi-visit history
export function getStorePayLaterCustomers(email?: string): PayLaterCustomer[] {
  const khataEntries = getStoreKhata(email);
  const bills = getStoreBills(email);

  const isMock = (name: string, inv: string) => {
    const n = (name || "").toLowerCase();
    const i = (inv || "").toUpperCase();
    return (
      n.includes("ramesh sharma") ||
      n.includes("priya patel") ||
      i === "INV-5120" ||
      i === "INV-5125" ||
      i === "INV-5188"
    );
  };

  // Map of bills by invoice number for quick item & time lookup
  const billMap = new Map<string, any>();
  for (const b of bills) {
    const inv = b.invoice || b.invoice_number;
    if (inv) billMap.set(String(inv).toLowerCase(), b);
  }

  const customerMap: Record<string, {
    customerName: string;
    customerPhone: string;
    totalGiven: number;
    totalRepaid: number;
    lastDate: string;
    visits: PayLaterVisit[];
    repayments: Array<{ amount: number; dateTime: string; note?: string }>;
    seenInvoices: Set<string>;
  }> = {};

  const phoneToKey = new Map<string, string>();
  const nameToKey = new Map<string, string>();

  const getOrInitCustomer = (rawName: string, rawPhone: string) => {
    const name = (rawName || "Customer").trim();
    const phone = (rawPhone || "").trim();
    const normName = name.toLowerCase();
    const cleanPhone = phone.replace(/[^0-9]/g, "");

    let targetKey: string | undefined;

    if (cleanPhone && phoneToKey.has(cleanPhone)) {
      targetKey = phoneToKey.get(cleanPhone)!;
    } else if (normName && normName !== "customer" && nameToKey.has(normName)) {
      targetKey = nameToKey.get(normName)!;
    }

    if (!targetKey) {
      targetKey = cleanPhone || normName || `cust-${Date.now()}`;
      customerMap[targetKey] = {
        customerName: name,
        customerPhone: phone,
        totalGiven: 0,
        totalRepaid: 0,
        lastDate: "",
        visits: [],
        repayments: [],
        seenInvoices: new Set<string>(),
      };
      if (cleanPhone) phoneToKey.set(cleanPhone, targetKey);
      if (normName && normName !== "customer") nameToKey.set(normName, targetKey);
    } else {
      if (!customerMap[targetKey].customerPhone && phone) {
        customerMap[targetKey].customerPhone = phone;
        if (cleanPhone) phoneToKey.set(cleanPhone, targetKey);
      }
      if (customerMap[targetKey].customerName === "Customer" && name !== "Customer") {
        customerMap[targetKey].customerName = name;
      }
    }
    return customerMap[targetKey];
  };

  // 1. Process Khata Entries
  for (const entry of khataEntries) {
    if (isMock(entry.customerName, entry.billInvoice || "")) continue;

    const cust = getOrInitCustomer(entry.customerName, entry.customerPhone);
    const eDate = new Date(entry.date);
    const dateFormatted = !isNaN(eDate.getTime())
      ? eDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "Recent";
    const timeFormatted = !isNaN(eDate.getTime())
      ? eDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
      : "";
    const dateTimeStr = `${dateFormatted}${timeFormatted ? ` at ${timeFormatted}` : ""}`;

    if (!cust.lastDate || entry.date > cust.lastDate) {
      cust.lastDate = entry.date;
    }

    if (entry.entryType === "GIVEN") {
      cust.totalGiven += entry.amount;

      // Extract items from entry or linked bill
      let items = Array.isArray(entry.items) && entry.items.length > 0 ? entry.items : [];
      let invoiceNum = entry.billInvoice || "";

      if ((!items || items.length === 0) && invoiceNum) {
        const matchingBill = billMap.get(invoiceNum.toLowerCase());
        if (matchingBill && Array.isArray(matchingBill.items)) {
          items = matchingBill.items;
        }
      }

      if (!items || items.length === 0) {
        items = [{
          product: entry.note || "Grocery Items",
          quantity: 1,
          unit_price: entry.amount,
          total: entry.amount,
        }];
      }

      const invKey = invoiceNum ? invoiceNum.toLowerCase() : `khata-${entry.id}`;
      cust.seenInvoices.add(invKey);

      cust.visits.push({
        id: entry.id,
        invoice: invoiceNum || `CREDIT-${String(entry.id).slice(-4)}`,
        dateTime: dateTimeStr,
        date: dateFormatted,
        time: timeFormatted,
        amount: entry.amount,
        items,
        note: entry.note,
      });
    } else {
      cust.totalRepaid += entry.amount;
      cust.repayments.push({
        amount: entry.amount,
        dateTime: dateTimeStr,
        note: entry.note || "Repayment received",
      });
    }
  }

  // 2. Also check any bills marked as Credit/Pending not yet in Khata
  for (const b of bills) {
    const isCredit =
      b.payment_mode === "Credit" ||
      b.payment_mode === "Udhar" ||
      b.status === "Pending" ||
      b.status === "Udhar";

    if (isCredit) {
      const inv = (b.invoice || b.invoice_number || "").toLowerCase();
      if (isMock(b.customer, inv)) continue;

      const cust = getOrInitCustomer(b.customer, b.phone || b.customer_phone || "");

      if (!cust.seenInvoices.has(inv)) {
        cust.seenInvoices.add(inv);
        const bDate = b.created_at ? new Date(b.created_at) : new Date();
        const dateFormatted = !isNaN(bDate.getTime())
          ? bDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : "Recent";
        const timeFormatted = b.time || (!isNaN(bDate.getTime())
          ? bDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
          : "");
        const amt = parseAmount(b.amount);

        cust.totalGiven += amt;
        const items = Array.isArray(b.items) && b.items.length > 0 ? b.items : [{
          product: "Billed Items",
          quantity: 1,
          unit_price: amt,
          total: amt,
        }];

        cust.visits.push({
          id: b.id || inv,
          invoice: b.invoice || b.invoice_number || "INV-CREDIT",
          dateTime: `${dateFormatted}${timeFormatted ? ` at ${timeFormatted}` : ""}`,
          date: dateFormatted,
          time: timeFormatted,
          amount: amt,
          items,
          note: `Invoice ${b.invoice}`,
        });
      }
    }
  }

  // Build final list with calculated totalDue and visit count
  const result: PayLaterCustomer[] = Object.values(customerMap).map((c) => {
    const totalDue = Math.max(0, c.totalGiven - c.totalRepaid);
    // Sort visits by most recent first
    c.visits.sort((a, b) => (b.id > a.id ? 1 : -1));
    return {
      customerName: c.customerName,
      customerPhone: c.customerPhone,
      totalDue,
      totalGiven: c.totalGiven,
      totalRepaid: c.totalRepaid,
      lastDate: c.lastDate,
      visitCount: c.visits.length,
      visits: c.visits,
      repayments: c.repayments,
    };
  });

  // Sort customers with highest pending balance first
  result.sort((a, b) => b.totalDue - a.totalDue);
  return result;
}

// Action helper to collect and settle Pay Later payment
export function settleCustomerPayLater(
  customerPhone: string,
  customerName: string,
  amount: number,
  paymentMode: "Cash" | "UPI" = "Cash",
  note: string = "",
  email?: string
) {
  // 1. Record payment in Khata
  recordKhataTransaction({
    customerName,
    customerPhone,
    amount,
    entryType: "RECEIVED",
    note: note || `Collected ₹${amount} via ${paymentMode}`,
  }, email);

  // 2. If the payment covers bills, mark those bills as Paid
  try {
    const bills = getStoreBills(email);
    let remaining = amount;
    let modified = false;

    for (const b of bills) {
      const matchCust =
        (b.phone && b.phone === customerPhone) ||
        (b.customer && b.customer.toLowerCase() === customerName.toLowerCase());

      const isUnpaid = b.status === "Pending" || b.status === "Udhar";
      if (matchCust && isUnpaid && remaining > 0) {
        const bAmt = parseAmount(b.amount);
        if (remaining >= bAmt) {
          b.status = "Paid";
          b.payment_mode = paymentMode;
          remaining -= bAmt;
          modified = true;
        }
      }
    }

    if (modified) {
      const storeEmail = (email || "default").toLowerCase().trim();
      localStorage.setItem(`quantum_bills_${storeEmail}`, JSON.stringify(bills));
    }
  } catch (err) {
    console.warn("Bill status settle notice:", err);
  }
}

export function getStoreKhataSummary(email?: string) {
  const entries = getStoreKhata(email);
  const customerMap: Record<string, {
    customerName: string;
    customerPhone: string;
    balance: number;
    totalGiven: number;
    totalReceived: number;
    lastDate: string;
    entries: KhataEntry[];
  }> = {};

  let totalGiven = 0;
  let totalReceived = 0;

  for (const e of entries) {
    const phone = e.customerPhone || e.customerName || "unknown";
    if (!customerMap[phone]) {
      customerMap[phone] = {
        customerName: e.customerName,
        customerPhone: e.customerPhone,
        balance: 0,
        totalGiven: 0,
        totalReceived: 0,
        lastDate: e.date,
        entries: [],
      };
    }

    if (e.entryType === 'GIVEN') {
      customerMap[phone].balance += e.amount;
      customerMap[phone].totalGiven += e.amount;
      totalGiven += e.amount;
    } else {
      customerMap[phone].balance -= e.amount;
      customerMap[phone].totalReceived += e.amount;
      totalReceived += e.amount;
    }
    customerMap[phone].entries.push(e);
  }

  const customers = Object.values(customerMap);
  const totalPending = Math.max(0, totalGiven - totalReceived);
  const debtorsCount = customers.filter(c => c.balance > 0).length;

  return {
    totalPending,
    totalRecovered: totalReceived,
    debtorsCount,
    customers,
    recentEntries: entries.slice(0, 50),
  };
}

export function queryStoreAssistantLocally(query: string, email?: string) {
  const bills = getStoreBills(email);
  const khata = getStoreKhataSummary(email);
  const products = getStoreProducts(email);
  const customers = getStoreCustomers(email);

  let totalSales = 0;
  for (const b of bills) {
    const amt = parseFloat(String(b.amount || "").replace(/[^0-9.]/g, "")) || 0;
    totalSales += amt;
  }

  const q = (query || "").toLowerCase();
  let spoken = "";
  let category = "general";

  const lowStockItems = products.filter((p) => {
    const s = p.stock !== undefined ? p.stock : (p.name.includes("Milk") || p.name.includes("Bread") || p.name.includes("Eggs") || p.name.includes("Curd") ? 3 : 20);
    return s <= 5;
  });

  if (q.includes("sale") || q.includes("collection") || q.includes("today") || q.includes("aaj") || q.includes("kamai") || q.includes("total")) {
    category = "sales";
    spoken = `Today's total sales collection is ₹${totalSales.toLocaleString('en-IN')}, with ${bills.length} bills recorded.`;
  } else if (q.includes("udhar") || q.includes("khata") || q.includes("credit") || q.includes("baki") || q.includes("pending")) {
    category = "khata";
    spoken = `You have ₹${khata.totalPending.toLocaleString('en-IN')} total pending in Udhar across ${khata.debtorsCount} customers.`;
  } else if (
    q.includes("low stock") ||
    q.includes("kam stock") ||
    q.includes("shortage") ||
    q.includes("restock") ||
    q.includes("out of stock") ||
    (q.includes("low") && q.includes("stock")) ||
    (q.includes("stock") && !q.includes("top") && !q.includes("selling"))
  ) {
    category = "low_stock";
    if (lowStockItems.length > 0) {
      const names = lowStockItems.slice(0, 4).map((p) => `${p.name} (${p.stock ?? 3} left)`).join(", ");
      spoken = `Attention: You have ${lowStockItems.length} items running low in stock. Please restock: ${names}.`;
    } else {
      spoken = "All grocery items currently have healthy stock levels. No low stock alerts right now.";
    }
  } else if (q.includes("product") || q.includes("item") || q.includes("bika") || q.includes("selling")) {
    category = "products";
    const top = products[0]?.name || "Daily groceries";
    spoken = `You have ${products.length} active grocery items in your catalog. Best seller is ${top}.`;
  } else if (q.includes("customer") || q.includes("grahak")) {
    category = "customers";
    spoken = `You have ${customers.length} registered customers in your database.`;
  } else {
    category = "summary";
    spoken = `Store Overview: Total sales ₹${totalSales.toLocaleString('en-IN')} across ${bills.length} bills, with ₹${khata.totalPending.toLocaleString('en-IN')} in pending customer Udhar, and ${lowStockItems.length} items low in stock.`;
  }

  return {
    success: true,
    query,
    spokenResponse: spoken,
    category,
    metrics: {
      todaySales: totalSales,
      billsCount: bills.length,
      pendingUdhar: khata.totalPending,
      debtorsCount: khata.debtorsCount,
      productsCount: products.length,
      customersCount: customers.length,
      lowStockCount: lowStockItems.length,
      low_stock_count: lowStockItems.length,
      low_stock_items: lowStockItems.slice(0, 4).map((p) => `${p.name} (${p.stock ?? 3} left)`),
    }
  };
}

// Shopkeeper profile update helper
export function updateShopkeeperProfileOffline(data: any): Shopkeeper {
  const email = (data.current_email || data.email || "").toLowerCase().trim();
  const shopkeepers = getStoredShopkeepers();
  let updatedShopkeeper: Shopkeeper | null = null;

  const updatedList = shopkeepers.map((s) => {
    if (s.email.toLowerCase() === email) {
      let nextUpi = s.upi_id;
      if (data.upi_id !== undefined) {
        const newUpi = String(data.upi_id).trim();
        const currentUpi = (s.upi_id || "").trim();
        if (newUpi !== currentUpi) {
          const verifyPwd = String(data.verify_password || data.current_password || "").trim();
          const storedPwd = String(s.password || "").trim();
          if (storedPwd) {
            if (!verifyPwd) {
              throw new Error("Account password is required to change your UPI ID.");
            }
            if (verifyPwd !== storedPwd && verifyPwd.toLowerCase() !== storedPwd.toLowerCase()) {
              throw new Error("Incorrect password. UPI ID was not changed.");
            }
          }
          nextUpi = newUpi;
        }
      }

      updatedShopkeeper = {
        ...s,
        name: data.name || (data as any).shopkeeper_name || s.name,
        store_name: data.store_name || (data as any).storeName || s.store_name,
        phone: data.phone || s.phone,
        address: data.address || s.address,
        upi_id: nextUpi,
        ...(data.password ? { password: data.password } : {}),
      };
      return updatedShopkeeper;
    }
    return s;
  });

  if (!updatedShopkeeper) {
    const builtin = BUILTIN_ACCOUNTS.find((s) => s.email.toLowerCase() === email);
    let nextUpi = data.upi_id || builtin?.upi_id || `${email.split("@")[0]}@upi`;
    if (builtin && data.upi_id !== undefined) {
      const newUpi = String(data.upi_id).trim();
      const currentUpi = (builtin.upi_id || "").trim();
      if (newUpi !== currentUpi) {
        const verifyPwd = String(data.verify_password || data.current_password || "").trim();
        const storedPwd = String(builtin.password || "").trim();
        if (storedPwd) {
          if (!verifyPwd) {
            throw new Error("Account password is required to change your UPI ID.");
          }
          if (verifyPwd !== storedPwd && verifyPwd.toLowerCase() !== storedPwd.toLowerCase()) {
            throw new Error("Incorrect password. UPI ID was not changed.");
          }
        }
        nextUpi = newUpi;
      }
    }

    updatedShopkeeper = {
      id: builtin?.id || Date.now(),
      name: data.name || builtin?.name || "Shopkeeper",
      email: email,
      store_name: data.store_name || (data as any).storeName || builtin?.store_name || "Smart Kirana",
      phone: data.phone || builtin?.phone || "9876543210",
      address: data.address || builtin?.address || "Main Market",
      upi_id: nextUpi,
      ...(data.password ? { password: data.password } : {}),
    };
    updatedList.push(updatedShopkeeper);
  }

  localStorage.setItem("quantum_shopkeepers", JSON.stringify(updatedList));
  localStorage.setItem("quantum_current_shopkeeper", JSON.stringify(updatedShopkeeper));
  localStorage.setItem("shopkeeper", JSON.stringify(updatedShopkeeper));
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

// Prohibited non-grocery keywords (Electronics, Vehicles, Furniture, Construction, Fashion/Jewelry, etc.)
export const NON_GROCERY_KEYWORDS = new Set([
  // Electronics & Computers
  "laptop", "laptops", "macbook", "macbooks", "computer", "computers", "pc", "desktop", 
  "monitor", "monitors", "cpu", "gpu", "graphics", "motherboard", "ram", "harddisk", "ssd", 
  "pendrive", "keyboard", "keyboards", "mouse", "printer", "printers", "scanner", "projector",
  // Mobile Phones & Gadgets
  "phone", "phones", "mobile", "mobiles", "smartphone", "smartphones", "iphone", "iphones",
  "samsung", "galaxy", "oneplus", "redmi", "realme", "vivo", "oppo", "pixel", "ipad", "ipads",
  "tablet", "tablets", "smartwatch", "smartwatches", "earphone", "earphones", "headphone", 
  "headphones", "airpod", "airpods", "earbuds", "speaker", "speakers", "soundbar", "charger", 
  "chargers", "powerbank", "power",
  // Home Appliances
  "tv", "tvs", "television", "televisions", "refrigerator", "refrigerators", "fridge", 
  "washing", "washer", "dryer", "ac", "cooler", "coolers", "microwave", "oven", "dishwasher", 
  "vacuum", "geyser", "heater",
  // Automobiles & Vehicles
  "car", "cars", "bike", "bikes", "motorcycle", "motorcycles", "scooter", "scooters", 
  "scooty", "truck", "trucks", "tractor", "bicycle", "bicycles", "cycle", "cycles", 
  "tyre", "tyres", "tire", "tires", "helmet", "helmets", "battery", "engine",
  // Furniture & Fixtures
  "sofa", "sofas", "bed", "beds", "mattress", "mattresses", "wardrobe", "almirah", 
  "chair", "chairs", "cupboard", "desk", "table", "curtain", "carpet",
  // Real Estate & Construction & Hardware
  "house", "flat", "apartment", "plot", "land", "cement", "brick", "bricks", "sand", 
  "marble", "granite", "plywood", "tile", "tiles", "paint", "hammer", "drill", "pipe",
  // Fashion, Footwear & Luxury Jewelry
  "shirt", "shirts", "tshirt", "tshirts", "pant", "pants", "jeans", "trousers", "saree", 
  "sarees", "dress", "dresses", "suit", "suits", "blazer", "jacket", "jackets", "shoes", 
  "shoe", "sneakers", "sneaker", "boots", "sandals", "heels", "handbag", "wallet", 
  "gold", "silver", "diamond", "platinum", "necklace", "ring", "rings", "bangle", "bangles", "earring",
  // Machinery & Weapons
  "generator", "crane", "lathe", "gun", "weapon", "pistol"
]);

export function containsNonGrocery(text: string): boolean {
  if (!text) return false;
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  return words.some((w) => NON_GROCERY_KEYWORDS.has(w));
}

export function parseVoiceBillLocally(rawText: string, email?: string): { success: boolean; is_grocery?: boolean; items: any[]; total_amount: number; error?: string } {
  if (!rawText || !rawText.trim()) {
    return { success: false, items: [], total_amount: 0 };
  }

  // Validate daily products policy
  if (containsNonGrocery(rawText)) {
    return {
      success: false,
      is_grocery: false,
      items: [],
      total_amount: 0,
      error: "This platform is for daily products only",
    };
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

// ─── Platform Super Admin Offline / Hybrid Aggregation ─────────────────────────
export function getPlatformAdminData() {
  const shopkeepers = getStoredShopkeepers();
  
  // Also check if active shopkeeper in localStorage isn't in quantum_shopkeepers list
  try {
    const active = JSON.parse(localStorage.getItem("shopkeeper") || "null");
    if (active && active.email) {
      const exists = shopkeepers.some((s) => s.email.toLowerCase() === active.email.toLowerCase());
      if (!exists) {
        shopkeepers.unshift({
          id: active.id || Date.now(),
          name: active.name || "Shopkeeper",
          store_name: active.store_name || "My Store",
          email: active.email,
          phone: active.phone || "",
          address: active.address || "",
          upi_id: active.upi_id || "",
        });
      }
    }
  } catch {}

  // Also discover any stores that have bills stored under quantum_bills_*
  if (typeof localStorage !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("quantum_bills_")) {
          const emailPart = key.replace("quantum_bills_", "").trim();
          if (emailPart && emailPart !== "default") {
            const exists = shopkeepers.some((s) => s.email.toLowerCase() === emailPart.toLowerCase());
            if (!exists) {
              const namePart = emailPart.split("@")[0].replace(/[._]/g, " ");
              shopkeepers.push({
                id: Math.abs(emailPart.split("").reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)),
                name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
                store_name: `${namePart.charAt(0).toUpperCase() + namePart.slice(1)}'s Store`,
                email: emailPart,
                phone: "",
                address: "",
                upi_id: "",
              });
            }
          }
        }
      }
    } catch {}
  }

  let platformTotalRevenue = 0;
  let platformTotalBills = 0;
  const allActivityBills: any[] = [];
  let totalProductsCount = 0;
  let totalCustomersCount = 0;

  const shopsList = shopkeepers.map((s) => {
    const bills = getStoreBills(s.email);
    const prods = getStoreProducts(s.email);
    const custs = getStoreCustomers(s.email);

    totalProductsCount += prods.length;
    totalCustomersCount += custs.length;

    let shopRev = 0;
    bills.forEach((b: any) => {
      const clean = String(b.amount || "0").replace(/[^\d.]/g, "");
      const num = parseFloat(clean) || 0;
      shopRev += num;

      allActivityBills.push({
        id: b.id || b.invoice,
        invoice: b.invoice || b.invoice_number,
        customer: b.customer || "Walk-in Customer",
        amount: b.amount || `₹${num}`,
        parsed_amount: num,
        payment_mode: b.payment_mode || "Cash",
        time: b.time || "Recent",
        created_at: b.created_at || new Date().toISOString(),
        shop_id: s.id,
        store_name: s.store_name,
        shopkeeper_name: s.name,
        status: b.status || "Paid"
      });
    });

    platformTotalRevenue += shopRev;
    platformTotalBills += bills.length;

    const latestBill = bills[0];
    const lastActive = latestBill ? (latestBill.time || "Recently active") : "Recently registered";

    return {
      id: s.id,
      name: s.name,
      store_name: s.store_name,
      email: s.email,
      phone: s.phone || "",
      address: s.address || "",
      upi_id: s.upi_id || "",
      created_at: new Date().toISOString(),
      created_at_formatted: "Recent",
      bills_count: bills.length,
      total_revenue: shopRev,
      formatted_revenue: `₹${shopRev.toLocaleString("en-IN")}`,
      products_count: prods.length,
      customers_count: custs.length,
      last_active: lastActive,
      status: (bills.length > 0 ? "Active" : prods.length > 0 ? "Catalog Ready" : "New Store") as "Active" | "Catalog Ready" | "New Store"
    };
  });

  allActivityBills.sort((a, b) => {
    const tA = new Date(a.created_at).getTime() || 0;
    const tB = new Date(b.created_at).getTime() || 0;
    return tB - tA;
  });

  const topShops = [...shopsList]
    .filter((s) => s.bills_count > 0 || s.total_revenue > 0)
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 5);

  const activeShopsCount = shopsList.filter((s) => s.bills_count > 0).length;

  return {
    summary: {
      total_shops: shopsList.length,
      active_shops: activeShopsCount > 0 ? activeShopsCount : (shopsList.length > 0 ? 1 : 0),
      total_platform_revenue: platformTotalRevenue,
      formatted_platform_revenue: `₹${platformTotalRevenue.toLocaleString("en-IN")}`,
      total_bills: platformTotalBills,
      total_products: totalProductsCount,
      total_customers: totalCustomersCount,
      today_revenue: platformTotalRevenue,
      formatted_today_revenue: `₹${platformTotalRevenue.toLocaleString("en-IN")}`,
      today_bills_count: platformTotalBills,
    },
    shops: shopsList,
    top_shops: topShops,
    recent_activity: allActivityBills.slice(0, 20),
  };
}
