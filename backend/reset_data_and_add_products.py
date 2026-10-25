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
        # Dairy & Breakfast
        {"name": "Amul Taaza Milk 500ml", "value": "₹30", "barcode": "8901262010053", "color": "bg-blue-500", "width": "45%", "sold": "0 sold"},
        {"name": "Amul Gold Milk 500ml", "value": "₹34", "barcode": "8901262010060", "color": "bg-amber-500", "width": "35%", "sold": "0 sold"},
        {"name": "Amul Butter 100g", "value": "₹58", "barcode": "8901262010015", "color": "bg-yellow-500", "width": "30%", "sold": "0 sold"},
        {"name": "Harvest White Bread 400g", "value": "₹45", "barcode": "8901725111221", "color": "bg-amber-600", "width": "40%", "sold": "0 sold"},
        {"name": "Farm Fresh Eggs 6-Pack", "value": "₹50", "barcode": "8904000100234", "color": "bg-orange-500", "width": "25%", "sold": "0 sold"},
        {"name": "Mother Dairy Curd 400g", "value": "₹35", "barcode": "8901648001024", "color": "bg-sky-500", "width": "20%", "sold": "0 sold"},
        {"name": "Amul Cheese Slices 200g", "value": "₹140", "barcode": "8901262020113", "color": "bg-yellow-600", "width": "15%", "sold": "0 sold"},
        {"name": "Kelloggs Corn Flakes 250g", "value": "₹110", "barcode": "8901499008123", "color": "bg-rose-500", "width": "15%", "sold": "0 sold"},

        # Staples, Atta, Rice & Cooking Essentials
        {"name": "Aashirvaad Shudh Chakki Atta 5kg", "value": "₹240", "barcode": "8901725121015", "color": "bg-amber-700", "width": "50%", "sold": "0 sold"},
        {"name": "Fortune Basmati Rice 1kg", "value": "₹120", "barcode": "8906007280014", "color": "bg-indigo-500", "width": "35%", "sold": "0 sold"},
        {"name": "Tata Sampann Toor Dal 1kg", "value": "₹165", "barcode": "8901058853116", "color": "bg-yellow-700", "width": "25%", "sold": "0 sold"},
        {"name": "Tata Sampann Moong Dal 1kg", "value": "₹140", "barcode": "8901058853123", "color": "bg-emerald-600", "width": "20%", "sold": "0 sold"},
        {"name": "Fortune Sunlite Sunflower Oil 1L", "value": "₹145", "barcode": "8906007280021", "color": "bg-amber-500", "width": "40%", "sold": "0 sold"},
        {"name": "Dhara Mustard Oil 1L", "value": "₹155", "barcode": "8901648011030", "color": "bg-yellow-600", "width": "30%", "sold": "0 sold"},
        {"name": "Tata Salt 1kg", "value": "₹28", "barcode": "8901058852331", "color": "bg-cyan-600", "width": "60%", "sold": "0 sold"},
        {"name": "Pure Refined Sugar 1kg", "value": "₹46", "barcode": "8901001001001", "color": "bg-slate-400", "width": "55%", "sold": "0 sold"},

        # Tea, Coffee, Biscuits & Snacks
        {"name": "Tata Tea Premium 500g", "value": "₹250", "barcode": "8901058851013", "color": "bg-emerald-700", "width": "35%", "sold": "0 sold"},
        {"name": "Red Label Tea 250g", "value": "₹135", "barcode": "8901030383014", "color": "bg-rose-600", "width": "30%", "sold": "0 sold"},
        {"name": "Nescafe Classic Coffee 50g", "value": "₹185", "barcode": "8901058862019", "color": "bg-amber-900", "width": "20%", "sold": "0 sold"},
        {"name": "Parle-G Gold Biscuits 250g", "value": "₹25", "barcode": "8901719101016", "color": "bg-yellow-500", "width": "70%", "sold": "0 sold"},
        {"name": "Britannia Good Day Butter 100g", "value": "₹30", "barcode": "8901063012010", "color": "bg-blue-600", "width": "50%", "sold": "0 sold"},
        {"name": "Britannia Marie Gold 250g", "value": "₹35", "barcode": "8901063013024", "color": "bg-amber-500", "width": "45%", "sold": "0 sold"},
        {"name": "Maggi 2-Minute Noodles 4-Pack", "value": "₹56", "barcode": "8901058842011", "color": "bg-yellow-500", "width": "65%", "sold": "0 sold"},
        {"name": "Lays Magic Masala Chips 50g", "value": "₹20", "barcode": "8901491101021", "color": "bg-blue-500", "width": "60%", "sold": "0 sold"},

        # Soaps, Oral & Personal Care
        {"name": "Dettol Original Soap 75g", "value": "₹38", "barcode": "8901396112012", "color": "bg-emerald-600", "width": "40%", "sold": "0 sold"},
        {"name": "Lifebuoy Total Soap 125g", "value": "₹36", "barcode": "8901030391026", "color": "bg-rose-500", "width": "35%", "sold": "0 sold"},
        {"name": "Colgate Strong Teeth 100g", "value": "₹62", "barcode": "8901314010014", "color": "bg-rose-600", "width": "45%", "sold": "0 sold"},
        {"name": "Close Up Red Hot Gel 80g", "value": "₹55", "barcode": "8901030401015", "color": "bg-red-600", "width": "25%", "sold": "0 sold"},
        {"name": "Clinic Plus Shampoo 175ml", "value": "₹110", "barcode": "8901030412011", "color": "bg-blue-600", "width": "30%", "sold": "0 sold"},
        {"name": "Head & Shoulders Shampoo 180ml", "value": "₹175", "barcode": "8901314510026", "color": "bg-sky-700", "width": "20%", "sold": "0 sold"},

        # Household & Cleaning
        {"name": "Surf Excel Easy Wash Detergent 1kg", "value": "₹135", "barcode": "8901030022012", "color": "bg-indigo-600", "width": "45%", "sold": "0 sold"},
        {"name": "Rin Detergent Bar 250g", "value": "₹20", "barcode": "8901030031014", "color": "bg-blue-700", "width": "50%", "sold": "0 sold"},
        {"name": "Vim Dishwash Gel 250ml", "value": "₹55", "barcode": "8901030421013", "color": "bg-lime-600", "width": "40%", "sold": "0 sold"},
        {"name": "Harpic Power Plus 500ml", "value": "₹95", "barcode": "8901396211029", "color": "bg-rose-700", "width": "30%", "sold": "0 sold"},

        # Fresh Vegetables / Staples
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
