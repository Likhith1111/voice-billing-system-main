import os
import sys
import csv
import json
import glob
from pathlib import Path

# Setup Django environment
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

try:
    import django
    django.setup()
    from api.models import Product, ShopkeeperProfile
except Exception as e:
    print(f"Error setting up Django: {e}")
    sys.exit(1)

def find_dataset_files():
    candidates = []
    # Check dataset/ directory
    dataset_dir = ROOT_DIR / 'dataset'
    if dataset_dir.exists():
        candidates.extend(glob.glob(str(dataset_dir / '*.csv')))
        candidates.extend(glob.glob(str(dataset_dir / '*.json')))
    
    # Check root directory
    candidates.extend(glob.glob(str(ROOT_DIR / '*grocery*.csv')))
    candidates.extend(glob.glob(str(ROOT_DIR / '*product*.csv')))
    candidates.extend(glob.glob(str(ROOT_DIR / '*dataset*.csv')))
    candidates.extend(glob.glob(str(ROOT_DIR / '*BigBasket*.csv')))
    candidates.extend(glob.glob(str(ROOT_DIR / '*grocery*.json')))
    candidates.extend(glob.glob(str(ROOT_DIR / '*product*.json')))

    # Remove duplicates
    seen = set()
    unique = []
    for c in candidates:
        norm = os.path.normpath(c)
        if norm not in seen:
            seen.add(norm)
            unique.append(norm)
    return unique

def normalize_key(k: str) -> str:
    return k.strip().lower().replace(' ', '_').replace('-', '_')

def parse_price(val) -> int:
    if val is None:
        return 0
    s = str(val).replace('₹', '').replace(',', '').replace('Rs.', '').replace('Rs', '').strip()
    try:
        return int(float(s))
    except:
        return 0

def load_products_from_file(file_path: str):
    products = []
    ext = os.path.splitext(file_path)[1].lower()

    if ext == '.csv':
        for encoding in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
            try:
                with open(file_path, mode='r', encoding=encoding) as f:
                    reader = csv.DictReader(f)
                    if not reader.fieldnames:
                        continue
                    field_map = {normalize_key(fn): fn for fn in reader.fieldnames}
                    
                    # Identify barcode key
                    barcode_key = None
                    for candidate in ['barcode', 'code', 'ean', 'ean13', 'upc', 'item_code']:
                        if candidate in field_map:
                            barcode_key = field_map[candidate]
                            break

                    # Identify name key
                    name_key = None
                    for candidate in ['product', 'name', 'product_name', 'item_name', 'item', 'title', 'description']:
                        if candidate in field_map:
                            name_key = field_map[candidate]
                            break

                    # Identify price key
                    price_key = None
                    for candidate in ['sale_price', 'price', 'mrp', 'rate', 'value', 'cost', 'unit_price', 'amount', 'market_price']:
                        if candidate in field_map:
                            price_key = field_map[candidate]
                            break

                    # Identify stock key
                    stock_key = None
                    for candidate in ['stock', 'qty', 'quantity', 'inventory', 'count']:
                        if candidate in field_map:
                            stock_key = field_map[candidate]
                            break

                    for idx, row in enumerate(reader):
                        name = (row.get(name_key) or '').strip() if name_key else ''
                        barcode = (row.get(barcode_key) or '').strip() if barcode_key else ''
                        price = parse_price(row.get(price_key)) if price_key else 0
                        stock = parse_price(row.get(stock_key)) if stock_key else 50
                        
                        if not name:
                            continue

                        # Generate 13-digit EAN-13 barcode if missing
                        if not barcode or barcode.isdigit() and len(barcode) < 12:
                            raw_idx = row.get('index') or row.get('id') or (idx + 1)
                            try:
                                num = int(str(raw_idx).strip())
                            except:
                                num = idx + 1
                            # 890 (India prefix) + 10-digit padded sequence
                            barcode = f"890{num:010d}"

                        products.append({
                            "name": name,
                            "barcode": barcode,
                            "price": price,
                            "stock": stock,
                            "value": f"₹{price}",
                            "sold": "0 sold",
                            "width": "35%",
                            "color": "bg-indigo-500"
                        })
                break
            except UnicodeDecodeError:
                continue

    elif ext == '.json':
        try:
            with open(file_path, mode='r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    data = data.get('products') or data.get('items') or data.get('data') or [data]
                if isinstance(data, list):
                    for idx, item in enumerate(data):
                        if not isinstance(item, dict):
                            continue
                        norm_dict = {normalize_key(k): v for k, v in item.items()}
                        name = norm_dict.get('product') or norm_dict.get('name') or norm_dict.get('product_name') or f"Product {idx+1}"
                        barcode = str(norm_dict.get('barcode') or norm_dict.get('code') or norm_dict.get('ean') or f"890{idx+1:010d}")
                        price = parse_price(norm_dict.get('sale_price') or norm_dict.get('price') or norm_dict.get('mrp') or norm_dict.get('value'))
                        stock = parse_price(norm_dict.get('stock') or norm_dict.get('qty') or 50)
                        products.append({
                            "name": str(name).strip(),
                            "barcode": barcode.strip(),
                            "price": price,
                            "stock": stock,
                            "value": f"₹{price}",
                            "sold": "0 sold",
                            "width": "35%",
                            "color": "bg-indigo-500"
                        })
        except Exception as e:
            print(f"Error parsing JSON {file_path}: {e}")

    return products

def sync_to_frontend(products):
    """Save top products to frontend public/dataset/products.json for instant offline billing."""
    frontend_dataset_dir = ROOT_DIR / 'frontend' / 'public' / 'dataset'
    frontend_dataset_dir.mkdir(parents=True, exist_ok=True)
    json_path = frontend_dataset_dir / 'products.json'
    try:
        # Cap to 500 items for browser snappy performance
        subset = products[:500] if len(products) > 500 else products
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(subset, f, indent=2, ensure_ascii=False)
        print(f"[OK] Synchronized {len(subset)} top products to frontend: {json_path}")
    except Exception as e:
        print(f"Warning: Could not sync to frontend public: {e}")

def run():
    print("==================================================")
    print("   QBill Grocery & Barcode Dataset Importer")
    print("==================================================")
    
    files = find_dataset_files()
    if not files:
        print("No dataset files found in dataset/ or project root.")
        print(f"Please place your CSV or JSON file in: {ROOT_DIR / 'dataset'}")
        print("Example: dataset/products.csv or dataset/BigBasket_Products.csv")
        return

    print(f"Found {len(files)} dataset file(s):")
    for f in files:
        print(f"  - {f}")

    all_products = []
    for f in files:
        prods = load_products_from_file(f)
        print(f"Loaded {len(prods)} products from {os.path.basename(f)}")
        all_products.extend(prods)

    if not all_products:
        print("No valid products could be extracted from dataset files.")
        return

    # Deduplicate by barcode, keeping genuine barcodes
    seen_barcodes = set()
    deduped = []
    for p in all_products:
        bc = p['barcode']
        if bc not in seen_barcodes:
            seen_barcodes.add(bc)
            deduped.append(p)

    print(f"\nTotal unique grocery products to import: {len(deduped)}")

    # Ensure shopkeeper exists
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

    # Save to database in bulk batches for extreme speed
    for sk in shopkeepers:
        existing_barcodes = set(Product.objects.filter(shopkeeper=sk).values_list('barcode', flat=True))
        
        to_create = []
        for p in deduped:
            if p['barcode'] not in existing_barcodes:
                to_create.append(
                    Product(
                        shopkeeper=sk,
                        name=p['name'],
                        value=p['value'],
                        barcode=p['barcode'],
                        color=p['color'],
                        width=p['width'],
                        sold=p['sold']
                    )
                )

        if to_create:
            print(f"Bulk inserting {len(to_create)} new products for {sk.email}...")
            Product.objects.bulk_create(to_create, batch_size=2000)
            print(f"Shopkeeper {sk.email}: {len(to_create)} products successfully added to database.")
        else:
            print(f"Shopkeeper {sk.email}: all {len(deduped)} products are already up to date.")

    # Sync to frontend offline public directory
    sync_to_frontend(deduped)

    print("\n==================================================")
    print(f"SUCCESS! {len(deduped)} grocery items loaded.")
    print("==================================================")

if __name__ == '__main__':
    run()
