# Groceries & Barcode Dataset Folder

Place your grocery dataset files in this folder (`dataset/`).

### Supported Formats & File Names
- `dataset/products.csv` or `dataset/groceries.csv` (CSV format)
- `dataset/*.csv` (Any CSV file)
- `dataset/products.json` or `dataset/groceries.json` (JSON format)

### Supported Columns (Headers are auto-detected):
- **Barcode / Code**: `barcode`, `code`, `ean`, `ean13`, `upc`, `item_code`
- **Product Name**: `name`, `product_name`, `item_name`, `title`, `description`
- **Price**: `price`, `mrp`, `rate`, `value`, `cost`, `unit_price`
- **Stock / Quantity** *(optional)*: `stock`, `qty`, `quantity`, `inventory`
- **Category** *(optional)*: `category`, `type`, `department`

### Sample CSV format:
```csv
barcode,name,price,stock,category
8901262010053,Amul Taaza Milk 500ml,30,50,Dairy
8901058842011,Maggi 2-Minute Noodles 4-Pack,56,60,Snacks
8901719101016,Parle-G Gold Biscuits 250g,25,80,Biscuits
```

### How to Import:
1. **From Command Line**:
   ```bash
   python backend/import_dataset.py
   ```
   Or:
   ```bash
   cd backend
   python manage.py import_dataset
   ```
2. **From the Web App**:
   Navigate to the **Products** page and click the **"Import Dataset / CSV"** button to upload any CSV directly from your computer or phone!
