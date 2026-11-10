import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Bill, Product, ShopkeeperProfile, Notification, HourlySales, RevenueTrend

def run():
    print("==================================================")
    print("STEP 1: Deleting all generated invoices / bills...")
    print("==================================================")
    bill_count = Bill.objects.count()
    Bill.objects.all().delete()
    print(f"Successfully deleted {bill_count} invoices/bills.")

    # Remove bill-related notifications so notification bell is clean
    del_notifs = Notification.objects.filter(title__startswith="New Bill").delete()
    print(f"Cleaned up {del_notifs[0]} bill notifications.")

    # Reset hourly sales back to 0 or fresh baseline
    for hs in HourlySales.objects.all():
        hs.sales = 0
        hs.save()
    print("Reset hourly sales graph to fresh baseline.")

    print("\n==================================================")
    print("STEP 2: Adding Daily Need Products with Real Prices...")
    print("==================================================")
    # Clear old products
    old_prod_count = Product.objects.count()
    Product.objects.all().delete()
    print(f"Removed {old_prod_count} old products.")

    shopkeepers = list(ShopkeeperProfile.objects.all())
    if not shopkeepers:
        default_sk = ShopkeeperProfile.objects.create(
            name="Rajesh Kumar",
            email="shopkeeper@example.com",
            store_name="Quantum Mart & Kirana",
            phone="9876543210",
            address="Shop #12, MG Road Market, Bengaluru",
            upi_id="rajeshkumar@okhdfcbank"
        )
        shopkeepers = [default_sk]

    daily_products = [
        # 1. Dairy, Milk, Eggs & Breakfast
        {"name": "Amul Taaza Milk 500ml", "value": "₹30", "barcode": "8901262010053", "color": "bg-blue-500", "width": "45%", "sold": "0 sold"},
        {"name": "Amul Gold Milk 500ml", "value": "₹34", "barcode": "8901262010060", "color": "bg-amber-500", "width": "35%", "sold": "0 sold"},
        {"name": "Amul Butter 100g", "value": "₹58", "barcode": "8901262010015", "color": "bg-yellow-500", "width": "30%", "sold": "0 sold"},
        {"name": "Amul Butter 500g", "value": "₹275", "barcode": "8901262010022", "color": "bg-yellow-600", "width": "25%", "sold": "0 sold"},
        {"name": "Amul Pure Ghee Tin 1L", "value": "₹610", "barcode": "8901262030013", "color": "bg-amber-600", "width": "20%", "sold": "0 sold"},
        {"name": "Amul Cheese Slices 200g", "value": "₹140", "barcode": "8901262020113", "color": "bg-yellow-600", "width": "15%", "sold": "0 sold"},
        {"name": "Harvest White Bread 400g", "value": "₹45", "barcode": "8901725111221", "color": "bg-amber-600", "width": "40%", "sold": "0 sold"},
        {"name": "English Oven Brown Bread 400g", "value": "₹55", "barcode": "8901725111238", "color": "bg-amber-700", "width": "30%", "sold": "0 sold"},
        {"name": "Farm Fresh Eggs 6-Pack", "value": "₹50", "barcode": "8904000100234", "color": "bg-orange-500", "width": "25%", "sold": "0 sold"},
        {"name": "Mother Dairy Curd 400g", "value": "₹35", "barcode": "8901648001024", "color": "bg-sky-500", "width": "20%", "sold": "0 sold"},
        {"name": "Kelloggs Corn Flakes 250g", "value": "₹110", "barcode": "8901499008123", "color": "bg-rose-500", "width": "15%", "sold": "0 sold"},
        {"name": "Nestle Everyday Dairy Whitener 400g", "value": "₹240", "barcode": "8901058891019", "color": "bg-blue-600", "width": "20%", "sold": "0 sold"},

        # 2. Staples, Atta, Rice, Dal & Cooking Essentials
        {"name": "Aashirvaad Shudh Chakki Atta 5kg", "value": "₹240", "barcode": "8901725121015", "color": "bg-amber-700", "width": "50%", "sold": "0 sold"},
        {"name": "Aashirvaad Select Sharbati Atta 5kg", "value": "₹295", "barcode": "8901725121022", "color": "bg-amber-800", "width": "35%", "sold": "0 sold"},
        {"name": "Fortune Chakki Fresh Atta 5kg", "value": "₹230", "barcode": "8906007280045", "color": "bg-amber-600", "width": "35%", "sold": "0 sold"},
        {"name": "Fortune Basmati Rice 1kg", "value": "₹120", "barcode": "8906007280014", "color": "bg-indigo-500", "width": "35%", "sold": "0 sold"},
        {"name": "Daawat Rozana Super Basmati Rice 5kg", "value": "₹450", "barcode": "8901537010014", "color": "bg-indigo-600", "width": "25%", "sold": "0 sold"},
        {"name": "India Gate Basmati Rice Feast 1kg", "value": "₹95", "barcode": "8906001790014", "color": "bg-indigo-700", "width": "30%", "sold": "0 sold"},
        {"name": "Tata Sampann Toor Dal 1kg", "value": "₹165", "barcode": "8901058853116", "color": "bg-yellow-700", "width": "25%", "sold": "0 sold"},
        {"name": "Tata Sampann Moong Dal 1kg", "value": "₹140", "barcode": "8901058853123", "color": "bg-emerald-600", "width": "20%", "sold": "0 sold"},
        {"name": "Tata Sampann Chana Dal 1kg", "value": "₹115", "barcode": "8901058853130", "color": "bg-amber-600", "width": "25%", "sold": "0 sold"},
        {"name": "Tata Sampann Urad Dal 1kg", "value": "₹160", "barcode": "8901058853147", "color": "bg-stone-600", "width": "20%", "sold": "0 sold"},
        {"name": "Fortune Sunlite Sunflower Oil 1L", "value": "₹145", "barcode": "8906007280021", "color": "bg-amber-500", "width": "40%", "sold": "0 sold"},
        {"name": "Saffola Gold Pro Healthy Oil 1L", "value": "₹165", "barcode": "8901088011012", "color": "bg-amber-600", "width": "30%", "sold": "0 sold"},
        {"name": "Dhara Mustard Oil 1L", "value": "₹155", "barcode": "8901648011030", "color": "bg-yellow-600", "width": "30%", "sold": "0 sold"},
        {"name": "Gemini Sunflower Oil 1L", "value": "₹140", "barcode": "8906012450013", "color": "bg-yellow-500", "width": "25%", "sold": "0 sold"},
        {"name": "Tata Salt 1kg", "value": "₹28", "barcode": "8901058852331", "color": "bg-cyan-600", "width": "60%", "sold": "0 sold"},
        {"name": "Pure Refined Sugar 1kg", "value": "₹46", "barcode": "8901001001001", "color": "bg-slate-400", "width": "55%", "sold": "0 sold"},

        # 3. Spices, Masalas, Pickles & Cooking Sauces
        {"name": "Everest Turmeric Powder 100g", "value": "₹34", "barcode": "8901786101018", "color": "bg-yellow-500", "width": "40%", "sold": "0 sold"},
        {"name": "Everest Tikhalal Chilli Powder 100g", "value": "₹48", "barcode": "8901786102015", "color": "bg-red-600", "width": "40%", "sold": "0 sold"},
        {"name": "Everest Coriander Powder 100g", "value": "₹38", "barcode": "8901786103012", "color": "bg-emerald-700", "width": "35%", "sold": "0 sold"},
        {"name": "Everest Garam Masala 100g", "value": "₹85", "barcode": "8901786104019", "color": "bg-amber-800", "width": "30%", "sold": "0 sold"},
        {"name": "MDH Chana Masala 100g", "value": "₹82", "barcode": "8901594101016", "color": "bg-orange-700", "width": "30%", "sold": "0 sold"},
        {"name": "MDH Kitchen King Masala 100g", "value": "₹85", "barcode": "8901594102013", "color": "bg-amber-700", "width": "30%", "sold": "0 sold"},
        {"name": "MDH Deggi Mirch 100g", "value": "₹92", "barcode": "8901594103010", "color": "bg-rose-700", "width": "25%", "sold": "0 sold"},
        {"name": "Catch Table Salt Sprinkler 200g", "value": "₹35", "barcode": "8901192101014", "color": "bg-cyan-500", "width": "30%", "sold": "0 sold"},
        {"name": "Catch Black Pepper Sprinkler 100g", "value": "₹95", "barcode": "8901192102011", "color": "bg-stone-700", "width": "25%", "sold": "0 sold"},
        {"name": "Maggi Masala-ae-Magic Pack of 10", "value": "₹50", "barcode": "8901058842059", "color": "bg-yellow-600", "width": "40%", "sold": "0 sold"},
        {"name": "Kissan Fresh Tomato Ketchup 500g", "value": "₹120", "barcode": "8901030461019", "color": "bg-red-600", "width": "25%", "sold": "0 sold"},
        {"name": "Maggi Rich Tomato Ketchup 500g", "value": "₹115", "barcode": "8901058871011", "color": "bg-rose-600", "width": "25%", "sold": "0 sold"},
        {"name": "Chings Secret Schezwan Chutney 250g", "value": "₹85", "barcode": "8901595102012", "color": "bg-red-700", "width": "30%", "sold": "0 sold"},

        # 4. Biscuits, Namkeen & Snacks
        {"name": "Parle-G Gold Biscuits 250g", "value": "₹25", "barcode": "8901719101016", "color": "bg-yellow-500", "width": "70%", "sold": "0 sold"},
        {"name": "Parle Monaco Salted Crackers 200g", "value": "₹35", "barcode": "8901719102020", "color": "bg-yellow-600", "width": "45%", "sold": "0 sold"},
        {"name": "Parle Krackjack Biscuits 200g", "value": "₹35", "barcode": "8901719103010", "color": "bg-amber-500", "width": "40%", "sold": "0 sold"},
        {"name": "Parle Hide & Seek Choco Chip 100g", "value": "₹40", "barcode": "8901719104055", "color": "bg-stone-800", "width": "35%", "sold": "0 sold"},
        {"name": "Britannia Good Day Butter 100g", "value": "₹30", "barcode": "8901063012010", "color": "bg-blue-600", "width": "50%", "sold": "0 sold"},
        {"name": "Britannia Good Day Cashew 100g", "value": "₹35", "barcode": "8901063012027", "color": "bg-amber-600", "width": "50%", "sold": "0 sold"},
        {"name": "Britannia Marie Gold 250g", "value": "₹35", "barcode": "8901063013024", "color": "bg-amber-500", "width": "45%", "sold": "0 sold"},
        {"name": "Britannia Bourbon Chocolate 120g", "value": "₹30", "barcode": "8901063014038", "color": "bg-stone-700", "width": "45%", "sold": "0 sold"},
        {"name": "Britannia Little Hearts 75g", "value": "₹25", "barcode": "8901063015028", "color": "bg-rose-500", "width": "40%", "sold": "0 sold"},
        {"name": "Sunfeast Dark Fantasy Choco Fills 75g", "value": "₹40", "barcode": "8901725141020", "color": "bg-stone-900", "width": "35%", "sold": "0 sold"},
        {"name": "Oreo Original Vanilla Cream 120g", "value": "₹40", "barcode": "8901233024041", "color": "bg-blue-700", "width": "45%", "sold": "0 sold"},
        {"name": "Maggi 2-Minute Noodles 4-Pack", "value": "₹56", "barcode": "8901058842011", "color": "bg-yellow-500", "width": "65%", "sold": "0 sold"},
        {"name": "Sunfeast YiPPee Magic Masala Noodles 240g", "value": "₹52", "barcode": "8901725151012", "color": "bg-orange-600", "width": "40%", "sold": "0 sold"},
        {"name": "Lays Magic Masala Chips 50g", "value": "₹20", "barcode": "8901491101021", "color": "bg-blue-500", "width": "60%", "sold": "0 sold"},
        {"name": "Lays Classic Salted Chips 50g", "value": "₹20", "barcode": "8901491101014", "color": "bg-yellow-400", "width": "50%", "sold": "0 sold"},
        {"name": "Lays Spanish Tomato Tango 50g", "value": "₹20", "barcode": "8901491101038", "color": "bg-red-500", "width": "50%", "sold": "0 sold"},
        {"name": "Kurkure Masala Munch 82g", "value": "₹20", "barcode": "8901491001086", "color": "bg-orange-500", "width": "60%", "sold": "0 sold"},
        {"name": "Haldirams Nagpur Aloo Bhujia 150g", "value": "₹45", "barcode": "8904004400477", "color": "bg-amber-600", "width": "50%", "sold": "0 sold"},
        {"name": "Haldirams Bhujia Sev 200g", "value": "₹55", "barcode": "8904004401030", "color": "bg-yellow-600", "width": "40%", "sold": "0 sold"},
        {"name": "Haldirams Khatta Meetha 200g", "value": "₹55", "barcode": "8904004401047", "color": "bg-orange-600", "width": "35%", "sold": "0 sold"},

        # 5. Beverages, Tea, Coffee & Cold Drinks
        {"name": "Tata Tea Premium 500g", "value": "₹250", "barcode": "8901058851013", "color": "bg-emerald-700", "width": "35%", "sold": "0 sold"},
        {"name": "Red Label Tea 250g", "value": "₹135", "barcode": "8901030383014", "color": "bg-rose-600", "width": "30%", "sold": "0 sold"},
        {"name": "Taj Mahal Tea 250g", "value": "₹190", "barcode": "8901030384028", "color": "bg-blue-800", "width": "20%", "sold": "0 sold"},
        {"name": "Wagh Bakri CTC Tea 500g", "value": "₹270", "barcode": "8906001020012", "color": "bg-emerald-800", "width": "25%", "sold": "0 sold"},
        {"name": "Nescafe Classic Coffee 50g", "value": "₹185", "barcode": "8901058862019", "color": "bg-amber-900", "width": "20%", "sold": "0 sold"},
        {"name": "BRU Instant Coffee 50g", "value": "₹120", "barcode": "8901030372018", "color": "bg-yellow-800", "width": "25%", "sold": "0 sold"},
        {"name": "Cadbury Bournvita 500g", "value": "₹245", "barcode": "8901233031025", "color": "bg-orange-700", "width": "20%", "sold": "0 sold"},
        {"name": "Horlicks Classic Malt 500g", "value": "₹260", "barcode": "8901571001018", "color": "bg-blue-600", "width": "20%", "sold": "0 sold"},
        {"name": "Coca-Cola Bottle 750ml", "value": "₹40", "barcode": "8901764012237", "color": "bg-red-600", "width": "45%", "sold": "0 sold"},
        {"name": "Thums Up Bottle 750ml", "value": "₹40", "barcode": "8901764022236", "color": "bg-blue-900", "width": "50%", "sold": "0 sold"},
        {"name": "Sprite Bottle 750ml", "value": "₹40", "barcode": "8901764032235", "color": "bg-emerald-600", "width": "40%", "sold": "0 sold"},
        {"name": "Maaza Mango Drink 600ml", "value": "₹42", "barcode": "8901764041214", "color": "bg-amber-500", "width": "45%", "sold": "0 sold"},
        {"name": "Frooti Mango Drink 160ml", "value": "₹15", "barcode": "8902579103028", "color": "bg-yellow-500", "width": "60%", "sold": "0 sold"},
        {"name": "Bisleri Mineral Water 1L", "value": "₹20", "barcode": "8906014400122", "color": "bg-teal-500", "width": "80%", "sold": "0 sold"},
        {"name": "Kinley Mineral Water 1L", "value": "₹20", "barcode": "8901764051015", "color": "bg-cyan-600", "width": "60%", "sold": "0 sold"},

        # 6. Chocolates & Confectionery
        {"name": "Cadbury Dairy Milk Chocolate 50g", "value": "₹45", "barcode": "8901233010020", "color": "bg-purple-700", "width": "60%", "sold": "0 sold"},
        {"name": "Cadbury 5 Star Bar 40g", "value": "₹20", "barcode": "8901233012017", "color": "bg-amber-700", "width": "50%", "sold": "0 sold"},
        {"name": "Nestle KitKat 4-Finger 38g", "value": "₹30", "barcode": "8901058863023", "color": "bg-red-600", "width": "50%", "sold": "0 sold"},
        {"name": "Nestle Munch Crunchy Bar 25g", "value": "₹10", "barcode": "8901058864013", "color": "bg-blue-600", "width": "70%", "sold": "0 sold"},
        {"name": "Cadbury Dairy Milk Silk 60g", "value": "₹80", "barcode": "8901233013014", "color": "bg-purple-800", "width": "30%", "sold": "0 sold"},
        {"name": "Cadbury Gems Surprise Ball 23g", "value": "₹25", "barcode": "8901233014011", "color": "bg-indigo-600", "width": "40%", "sold": "0 sold"},

        # 7. Soaps, Oral, Hair & Personal Care
        {"name": "Dettol Original Soap 75g", "value": "₹38", "barcode": "8901396112012", "color": "bg-emerald-600", "width": "40%", "sold": "0 sold"},
        {"name": "Lifebuoy Total Soap 125g", "value": "₹36", "barcode": "8901030391026", "color": "bg-rose-500", "width": "35%", "sold": "0 sold"},
        {"name": "Dove Cream Beauty Bar 100g", "value": "₹68", "barcode": "8901030392023", "color": "bg-blue-400", "width": "35%", "sold": "0 sold"},
        {"name": "Lux Velvet Glow Rose Soap 100g", "value": "₹42", "barcode": "8901030393013", "color": "bg-pink-500", "width": "40%", "sold": "0 sold"},
        {"name": "Pears Pure & Gentle Soap 125g", "value": "₹75", "barcode": "8901030394010", "color": "bg-amber-500", "width": "30%", "sold": "0 sold"},
        {"name": "Cinthol Original Deodorant Soap 100g", "value": "₹45", "barcode": "8901023011016", "color": "bg-red-600", "width": "35%", "sold": "0 sold"},
        {"name": "Colgate Strong Teeth 100g", "value": "₹62", "barcode": "8901314010014", "color": "bg-rose-600", "width": "45%", "sold": "0 sold"},
        {"name": "Close Up Red Hot Gel 80g", "value": "₹55", "barcode": "8901030401015", "color": "bg-red-600", "width": "25%", "sold": "0 sold"},
        {"name": "Dabur Red Ayurvedic Toothpaste 150g", "value": "₹75", "barcode": "8901207011015", "color": "bg-red-700", "width": "35%", "sold": "0 sold"},
        {"name": "Sensodyne Fresh Mint Toothpaste 75g", "value": "₹145", "barcode": "8901571011017", "color": "bg-blue-600", "width": "25%", "sold": "0 sold"},
        {"name": "Clinic Plus Shampoo 175ml", "value": "₹110", "barcode": "8901030412011", "color": "bg-blue-600", "width": "30%", "sold": "0 sold"},
        {"name": "Head & Shoulders Shampoo 180ml", "value": "₹175", "barcode": "8901314510026", "color": "bg-sky-700", "width": "20%", "sold": "0 sold"},
        {"name": "Parachute 100% Coconut Hair Oil 200ml", "value": "₹85", "barcode": "8901088021011", "color": "bg-blue-500", "width": "45%", "sold": "0 sold"},
        {"name": "Dabur Amla Hair Oil 180ml", "value": "₹95", "barcode": "8901207021014", "color": "bg-emerald-700", "width": "35%", "sold": "0 sold"},
        {"name": "Lifebuoy Handwash Refill 185ml", "value": "₹45", "barcode": "8901030431012", "color": "bg-rose-600", "width": "40%", "sold": "0 sold"},
        {"name": "Dettol Liquid Handwash Pump 200ml", "value": "₹99", "barcode": "8901396121014", "color": "bg-emerald-600", "width": "30%", "sold": "0 sold"},
        {"name": "Dettol Antiseptic Liquid 125ml", "value": "₹88", "barcode": "8901396131013", "color": "bg-amber-600", "width": "30%", "sold": "0 sold"},
        {"name": "Savlon Antiseptic Liquid 100ml", "value": "₹42", "barcode": "8901725161011", "color": "bg-orange-600", "width": "30%", "sold": "0 sold"},
        {"name": "Vaseline Petroleum Jelly 42g", "value": "₹45", "barcode": "8901030491016", "color": "bg-blue-500", "width": "35%", "sold": "0 sold"},
        {"name": "Nivea Creme Moisturizer 100ml", "value": "₹140", "barcode": "8904256001017", "color": "bg-blue-700", "width": "25%", "sold": "0 sold"},

        # 8. Household & Cleaning
        {"name": "Surf Excel Easy Wash Detergent 1kg", "value": "₹135", "barcode": "8901030022012", "color": "bg-indigo-600", "width": "45%", "sold": "0 sold"},
        {"name": "Ariel Matic Front Load Detergent 1kg", "value": "₹240", "barcode": "8901314810010", "color": "bg-blue-700", "width": "25%", "sold": "0 sold"},
        {"name": "Tide Plus Extra Power Detergent 1kg", "value": "₹125", "barcode": "8901314820019", "color": "bg-orange-500", "width": "35%", "sold": "0 sold"},
        {"name": "Rin Detergent Bar 250g", "value": "₹20", "barcode": "8901030031014", "color": "bg-blue-700", "width": "50%", "sold": "0 sold"},
        {"name": "Wheel 2in1 Detergent Powder 1kg", "value": "₹72", "barcode": "8901030041013", "color": "bg-emerald-600", "width": "40%", "sold": "0 sold"},
        {"name": "Comfort Fabric Conditioner 220ml", "value": "₹65", "barcode": "8901030051012", "color": "bg-sky-500", "width": "30%", "sold": "0 sold"},
        {"name": "Vim Dishwash Gel 250ml", "value": "₹55", "barcode": "8901030421013", "color": "bg-lime-600", "width": "40%", "sold": "0 sold"},
        {"name": "Vim Lemon Dishwash Bar 135g", "value": "₹10", "barcode": "8901030422010", "color": "bg-lime-500", "width": "75%", "sold": "0 sold"},
        {"name": "Pril Dishwashing Liquid Lime 225ml", "value": "₹55", "barcode": "8901399011015", "color": "bg-emerald-500", "width": "35%", "sold": "0 sold"},
        {"name": "Harpic Power Plus 500ml", "value": "₹95", "barcode": "8901396211029", "color": "bg-rose-700", "width": "30%", "sold": "0 sold"},
        {"name": "Colin Glass Cleaner 500ml", "value": "₹105", "barcode": "8901396221011", "color": "bg-cyan-500", "width": "30%", "sold": "0 sold"},
        {"name": "Lizol Floor Cleaner 500ml", "value": "₹110", "barcode": "8901396231010", "color": "bg-red-500", "width": "35%", "sold": "0 sold"},
        {"name": "Good Knight Gold Flash Refill 45ml", "value": "₹82", "barcode": "8901023021015", "color": "bg-red-600", "width": "40%", "sold": "0 sold"},
        {"name": "All Out Ultra Mosquito Refill 45ml", "value": "₹80", "barcode": "8901198011010", "color": "bg-blue-600", "width": "35%", "sold": "0 sold"},
        {"name": "Odonil Room Air Freshener 50g", "value": "₹55", "barcode": "8901207031013", "color": "bg-purple-600", "width": "35%", "sold": "0 sold"},

        # 9. Fresh Daily Vegetables & Produce
        {"name": "Fresh Onions 1kg", "value": "₹35", "barcode": "8900000000018", "color": "bg-purple-600", "width": "70%", "sold": "0 sold"},
        {"name": "Fresh Potatoes 1kg", "value": "₹30", "barcode": "8900000000025", "color": "bg-amber-600", "width": "75%", "sold": "0 sold"},
        {"name": "Fresh Tomatoes 1kg", "value": "₹40", "barcode": "8900000000032", "color": "bg-rose-500", "width": "65%", "sold": "0 sold"},
        {"name": "Fresh Green Chillies 250g", "value": "₹20", "barcode": "8900000000049", "color": "bg-emerald-500", "width": "50%", "sold": "0 sold"},
        {"name": "Fresh Ginger 250g", "value": "₹30", "barcode": "8900000000056", "color": "bg-amber-700", "width": "45%", "sold": "0 sold"},
    ]

    for sk in shopkeepers:
        for p in daily_products:
            Product.objects.create(
                shopkeeper=sk,
                name=p["name"],
                value=p["value"],
                barcode=p["barcode"],
                color=p["color"],
                width=p["width"],
                sold=p["sold"]
            )
        print(f"Created {len(daily_products)} daily need products for shopkeeper: {sk.email}")

    print("\n==================================================")
    print("DONE! Invoices deleted & daily need products loaded.")
    print("==================================================")

if __name__ == '__main__':
    run()
