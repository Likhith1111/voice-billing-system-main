import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { parseAmount } from "./offlineStore";

export interface InvoiceItem {
  product: string;
  quantity: number;
  unit_price: number;
  total?: number;
}

export interface BillData {
  id?: string | number;
  invoice?: string;
  invoice_number?: string;
  customer?: string;
  customer_name?: string;
  phone?: string;
  customer_phone?: string;
  amount?: string | number;
  total?: string | number;
  grand_total?: string | number;
  time?: string;
  created_at?: string;
  payment_mode?: string;
  status?: string;
  order_type?: string;
  table_no?: string;
  token_no?: string;
  items?: InvoiceItem[];
}

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates an exact pixel-perfect thermal receipt PDF matching the user's restaurant/store template.
 * Renders via an offscreen DOM container with html2canvas to ensure 100% accurate column alignment,
 * native Rupee symbol (₹) display, perfectly aligned colons, dashed separators, and custom fonts.
 */
export async function generateInvoicePdfBlob(bill: BillData, shopkeeper?: any): Promise<Blob> {
  const invoiceNum = bill.invoice || bill.invoice_number || `SKB/${new Date().getFullYear().toString().slice(-2)}-${String(new Date().getMonth() + 1).padStart(2, "0")}/${Math.floor(1000 + Math.random() * 9000)}`;
  const customerName = bill.customer || bill.customer_name || "Dine In Guest";
  const customerPhone = bill.phone || bill.customer_phone || "";
  const grandTotal = parseAmount(bill.amount || bill.total || bill.grand_total || 0);
  const paymentMode = (bill.payment_mode || "UPI").toUpperCase();
  const status = (bill.status || "Paid").toUpperCase();
  const orderType = bill.order_type || "Dine In";
  const tableNo = bill.table_no || "T-08";
  const tokenNo = bill.token_no || `A${Math.floor(10 + Math.random() * 90)}`;

  const storeName = (shopkeeper?.store_name || shopkeeper?.business_name || "YOUR RESTAURANT").toUpperCase();
  const storeAddress = shopkeeper?.address || "Your Restaurant Address, Main Market";
  const storePhone = shopkeeper?.phone ? `Ph: ${shopkeeper.phone}` : "Ph: 080-4567-8910";
  const gstin = shopkeeper?.gstin || (shopkeeper?.upi_id ? `${shopkeeper.upi_id}` : "29ABCDE1234F1Z5");

  const billedDate = bill.created_at ? new Date(bill.created_at) : new Date();
  const dateStr = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(billedDate);
  const timeStr = bill.time || new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(billedDate);

  const rawItems: InvoiceItem[] = Array.isArray(bill.items) && bill.items.length > 0
    ? bill.items
    : [
        {
          product: "Retail Purchase",
          quantity: 1,
          unit_price: grandTotal,
          total: grandTotal,
        },
      ];

  // Calculate taxes: assume inclusive 5% GST (2.5% CGST + 2.5% SGST)
  const finalGrand = grandTotal > 0 ? grandTotal : rawItems.reduce((acc, it) => acc + (Number(it.quantity || 1) * parseAmount(it.unit_price || 0)), 0);
  const preTax = finalGrand / 1.05;
  const cgst = preTax * 0.025;
  const sgst = preTax * 0.025;

  const itemsRowsHtml = rawItems
    .map((item, idx) => {
      const qty = Number(item.quantity) || 1;
      const price = parseAmount(item.unit_price || 0);
      const lineTotal = parseAmount(item.total || qty * price);
      return `
        <tr style="border-bottom: 1px dashed #999;">
          <td style="padding: 6px 0; text-align: left; font-weight: 700; vertical-align: top; line-height: 1.3;">
            ${idx + 1}. ${escapeHtml(item.product)}
          </td>
          <td style="padding: 6px 0; text-align: center; font-weight: 600; vertical-align: top;">
            ${qty}
          </td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600; vertical-align: top; white-space: nowrap;">
            ₹${price.toFixed(2)}
          </td>
          <td style="padding: 6px 0; text-align: right; font-weight: 800; vertical-align: top; white-space: nowrap;">
            ₹${lineTotal.toFixed(2)}
          </td>
        </tr>
      `;
    })
    .join("");

  // Create an offscreen DOM container styled exactly like the user's template image
  const receiptDiv = document.createElement("div");
  receiptDiv.style.position = "fixed";
  receiptDiv.style.left = "-9999px";
  receiptDiv.style.top = "0";
  receiptDiv.style.width = "380px";
  receiptDiv.style.backgroundColor = "#ffffff";
  receiptDiv.style.color = "#000000";
  receiptDiv.style.border = "1.5px solid #000000";
  receiptDiv.style.padding = "24px 20px 28px 20px";
  receiptDiv.style.boxSizing = "border-box";
  receiptDiv.style.fontFamily = "'Courier New', Courier, monospace, 'Segoe UI', sans-serif";
  receiptDiv.style.zIndex = "-9999";

  receiptDiv.innerHTML = `
    <div style="width: 100%; box-sizing: border-box; text-align: left;">
      <!-- Top Restaurant/Store Logo -->
      <div style="display: flex; justify-content: center; margin-bottom: 14px;">
        <div style="
          width: 46px;
          height: 46px;
          border: 1.8px solid #000000;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"></path>
            <path d="M15 2v14a3 3 0 0 1-3 3H6"></path>
            <path d="M6 2v10"></path>
            <path d="M3 2v4a3 3 0 0 0 3 3"></path>
          </svg>
        </div>
      </div>

      <!-- Store Name -->
      <div style="
        font-size: 21px;
        font-weight: 900;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 6px;
        line-height: 1.2;
      ">
        ${escapeHtml(storeName)}
      </div>

      <!-- Tagline with lines -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-bottom: 10px;
      ">
        <div style="flex: 1; height: 1px; background: #000000; max-width: 42px;"></div>
        <div style="
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 1px;
          text-align: center;
          line-height: 1.3;
        ">
          GOOD FOOD. GREAT MEMORIES.
        </div>
        <div style="flex: 1; height: 1px; background: #000000; max-width: 42px;"></div>
      </div>

      <!-- Address & Phone -->
      <div style="
        font-size: 11px;
        text-align: center;
        line-height: 1.45;
        color: #222222;
        margin-bottom: 8px;
      ">
        ${escapeHtml(storeAddress)}<br />
        ${escapeHtml(storePhone)}
      </div>

      <!-- GSTIN -->
      <div style="
        font-size: 11.5px;
        font-weight: 800;
        text-align: center;
        letter-spacing: 0.5px;
        margin-bottom: 12px;
      ">
        GSTIN: ${escapeHtml(gstin)}
      </div>

      <!-- Dashed divider -->
      <div style="border-top: 1.2px dashed #666; margin: 8px 0;"></div>

      <!-- Meta Info Table with aligned colons -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; line-height: 1.65;">
        <tbody>
          <tr>
            <td style="width: 32%; text-align: left; font-weight: 700;">Bill No.</td>
            <td style="width: 8%; text-align: center; font-weight: 700;">:</td>
            <td style="width: 60%; text-align: right; font-weight: 700;">${escapeHtml(invoiceNum)}</td>
          </tr>
          <tr>
            <td style="text-align: left; font-weight: 700;">Date</td>
            <td style="text-align: center; font-weight: 700;">:</td>
            <td style="text-align: right;">${escapeHtml(dateStr)}</td>
          </tr>
          <tr>
            <td style="text-align: left; font-weight: 700;">Time</td>
            <td style="text-align: center; font-weight: 700;">:</td>
            <td style="text-align: right;">${escapeHtml(timeStr)}</td>
          </tr>
          <tr>
            <td style="text-align: left; font-weight: 700;">Order Type</td>
            <td style="text-align: center; font-weight: 700;">:</td>
            <td style="text-align: right;">${escapeHtml(orderType)}</td>
          </tr>
          <tr>
            <td style="text-align: left; font-weight: 700;">Table No.</td>
            <td style="text-align: center; font-weight: 700;">:</td>
            <td style="text-align: right;">${escapeHtml(tableNo)}</td>
          </tr>
          <tr>
            <td style="text-align: left; font-weight: 700;">Token No.</td>
            <td style="text-align: center; font-weight: 700;">:</td>
            <td style="text-align: right;">${escapeHtml(tokenNo)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Dashed divider -->
      <div style="border-top: 1.2px dashed #666; margin: 8px 0;"></div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; margin-top: 2px;">
        <thead>
          <tr style="border-bottom: 1.5px solid #000000; font-weight: 900; font-size: 11px;">
            <th style="text-align: left; padding: 4px 0;">ITEM</th>
            <th style="text-align: center; width: 44px; padding: 4px 0;">QTY</th>
            <th style="text-align: right; width: 75px; padding: 4px 0;">UNIT</th>
            <th style="text-align: right; width: 80px; padding: 4px 0;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml}
        </tbody>
      </table>

      <!-- Dashed divider -->
      <div style="border-top: 1.2px dashed #666; margin: 8px 0;"></div>

      <!-- Totals Section -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; line-height: 1.65;">
        <tbody>
          <tr>
            <td style="text-align: left; font-weight: 700;">SUBTOTAL</td>
            <td style="text-align: right; font-weight: 700;">₹${preTax.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="text-align: left;">CGST (2.5%)</td>
            <td style="text-align: right;">₹${cgst.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="text-align: left;">SGST (2.5%)</td>
            <td style="text-align: right;">₹${sgst.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Solid double border for GRAND TOTAL -->
      <div style="
        border-top: 2px solid #000000;
        border-bottom: 2px solid #000000;
        margin: 8px 0;
        padding: 7px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <span style="font-size: 15px; font-weight: 900; letter-spacing: 0.5px;">GRAND TOTAL</span>
        <span style="font-size: 18px; font-weight: 900;">₹${finalGrand.toFixed(2)}</span>
      </div>

      <!-- Dashed divider -->
      <div style="border-top: 1.2px dashed #666; margin: 8px 0;"></div>

      <!-- Customer Name -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; line-height: 1.5;">
        <tbody>
          <tr>
            <td style="width: 34%; text-align: left; font-weight: 700;">Customer Name</td>
            <td style="width: 6%; text-align: center; font-weight: 700;">:</td>
            <td style="width: 60%; text-align: right; font-weight: 600;">${escapeHtml(customerName)}</td>
          </tr>
          ${
            customerPhone
              ? `<tr>
                  <td style="text-align: left; font-weight: 700;">Phone</td>
                  <td style="text-align: center; font-weight: 700;">:</td>
                  <td style="text-align: right;">${escapeHtml(customerPhone)}</td>
                </tr>`
              : ""
          }
        </tbody>
      </table>

      <!-- Dashed divider -->
      <div style="border-top: 1.2px dashed #666; margin: 8px 0;"></div>

      <!-- Payment Status -->
      <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 2px 0;">
        <span style="font-weight: 600;">Payment Status</span>
        <span style="font-weight: 900; letter-spacing: 0.5px;">${escapeHtml(status)}</span>
      </div>

      <!-- Dashed divider -->
      <div style="border-top: 1.2px dashed #666; margin: 8px 0;"></div>

      <!-- Payment Mode -->
      <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 2px 0;">
        <span style="font-weight: 600;">Payment Mode</span>
        <span style="font-weight: 900; letter-spacing: 0.5px;">${escapeHtml(paymentMode)}</span>
      </div>

      <!-- Footer Thank You -->
      <div style="text-align: center; margin-top: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px;">
        THANK YOU, VISIT AGAIN!
      </div>

      <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin: 10px 0;">
        <div style="width: 44px; height: 1.2px; background: #000000;"></div>
        <span style="font-size: 11px;">★</span>
        <div style="width: 44px; height: 1.2px; background: #000000;"></div>
      </div>

      <div style="text-align: center; font-size: 14px; font-weight: 900; letter-spacing: 1.5px;">
        THANK YOU
      </div>
      <div style="text-align: center; font-size: 11.5px; font-style: italic; color: #222222; margin-top: 2px;">
        Visit Again!
      </div>
    </div>
  `;

  document.body.appendChild(receiptDiv);

  try {
    const canvas = await html2canvas(receiptDiv, {
      scale: 2.5, // Crisp high-DPI rendering
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdfWidth = 80; // mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [pdfWidth, pdfHeight],
    });

    doc.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    return doc.output("blob");
  } catch (renderError) {
    console.error("html2canvas receipt render failed, using vector fallback:", renderError);
    return generateVectorReceiptBlob(bill, shopkeeper);
  } finally {
    if (document.body.contains(receiptDiv)) {
      document.body.removeChild(receiptDiv);
    }
  }
}

/**
 * Pure jsPDF vector fallback in case html2canvas is not available in environment.
 */
function generateVectorReceiptBlob(bill: BillData, shopkeeper?: any): Blob {
  const invoiceNum = bill.invoice || bill.invoice_number || `INV-${Math.floor(1000 + Math.random() * 9000)}`;
  const customerName = bill.customer || bill.customer_name || "Dine In Guest";
  const grandTotal = parseAmount(bill.amount || bill.total || bill.grand_total || 0);
  const paymentMode = (bill.payment_mode || "UPI").toUpperCase();
  const status = (bill.status || "Paid").toUpperCase();

  const storeName = (shopkeeper?.store_name || "YOUR RESTAURANT").toUpperCase();
  const storeAddress = shopkeeper?.address || "Your Restaurant Address, Main Market";
  const storePhone = shopkeeper?.phone ? `Ph: ${shopkeeper.phone}` : "Ph: 080-4567-8910";
  const gstin = shopkeeper?.gstin || "29ABCDE1234F1Z5";

  const billedDate = bill.created_at ? new Date(bill.created_at) : new Date();
  const dateStr = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(billedDate);
  const timeStr = bill.time || new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(billedDate);

  const rawItems = Array.isArray(bill.items) && bill.items.length > 0
    ? bill.items
    : [{ product: "Retail Purchase", quantity: 1, unit_price: grandTotal, total: grandTotal }];

  const W = 80;
  const H = Math.max(160, 110 + rawItems.length * 10);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [W, H] });

  const ML = 5;
  const MR = W - 5;
  const CX = W / 2;

  // Outer border
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.rect(ML - 1, 4, (MR - ML) + 2, H - 8);

  let y = 10;
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.text(storeName, CX, y, { align: "center" });
  y += 4.5;

  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.text("GOOD FOOD. GREAT MEMORIES.", CX, y, { align: "center" });
  y += 4;
  doc.text(storeAddress, CX, y, { align: "center" });
  y += 3.5;
  doc.text(storePhone, CX, y, { align: "center" });
  y += 3.5;
  doc.text(`GSTIN: ${gstin}`, CX, y, { align: "center" });
  y += 4;

  const drawDash = (curY: number) => {
    doc.setLineDashPattern([1, 1], 0);
    doc.line(ML, curY, MR, curY);
    doc.setLineDashPattern([], 0);
  };

  drawDash(y); y += 4;

  const rows = [
    ["Bill No.", invoiceNum],
    ["Date", dateStr],
    ["Time", timeStr],
    ["Order Type", "Dine In"],
  ];
  rows.forEach(([k, v]) => {
    doc.text(k, ML, y);
    doc.text(":", ML + 22, y);
    doc.text(v, MR, y, { align: "right" });
    y += 3.8;
  });

  drawDash(y); y += 4;

  doc.setFont("courier", "bold");
  doc.text("ITEM", ML, y);
  doc.text("QTY", ML + 34, y, { align: "center" });
  doc.text("UNIT", ML + 50, y, { align: "right" });
  doc.text("TOTAL", MR, y, { align: "right" });
  y += 2.5;

  doc.setLineWidth(0.3);
  doc.line(ML, y, MR, y);
  y += 3.5;

  doc.setFont("courier", "normal");
  rawItems.forEach((it, idx) => {
    const q = Number(it.quantity) || 1;
    const p = parseAmount(it.unit_price || 0);
    const tot = parseAmount(it.total || q * p);
    doc.text(`${idx + 1}. ${it.product}`.slice(0, 18), ML, y);
    doc.text(String(q), ML + 34, y, { align: "center" });
    doc.text(`Rs.${p.toFixed(2)}`, ML + 50, y, { align: "right" });
    doc.text(`Rs.${tot.toFixed(2)}`, MR, y, { align: "right" });
    y += 4;
  });

  drawDash(y); y += 4;

  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.line(ML, y - 1, MR, y - 1);
  doc.text("GRAND TOTAL", ML, y + 2.5);
  doc.text(`Rs.${grandTotal.toFixed(2)}`, MR, y + 2.5, { align: "right" });
  doc.line(ML, y + 4.5, MR, y + 4.5);
  y += 8;

  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.text("Customer", ML, y);
  doc.text(":", ML + 22, y);
  doc.text(customerName, MR, y, { align: "right" });
  y += 4;
  doc.text("Status", ML, y);
  doc.text(status, MR, y, { align: "right" });
  y += 4;
  doc.text("Payment Mode", ML, y);
  doc.text(paymentMode, MR, y, { align: "right" });
  y += 6;

  doc.setFont("courier", "bold");
  doc.text("THANK YOU, VISIT AGAIN!", CX, y, { align: "center" });

  return doc.output("blob");
}

/**
 * Downloads or shares a PDF Blob on mobile devices and desktops.
 */
export async function downloadOrSharePdf(pdfBlob: Blob, rawFilename: string): Promise<boolean> {
  const filename = rawFilename.endsWith(".pdf") ? rawFilename : `${rawFilename}.pdf`;

  // Try Native Web Share API first (Mobile iOS Safari & Android Chrome standard)
  try {
    const file = new File([pdfBlob], filename, { type: "application/pdf" });
    if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: filename,
        text: `Invoice ${filename}`,
      });
      return true;
    }
  } catch (shareErr: any) {
    if (shareErr.name === "AbortError") {
      return true;
    }
    console.warn("Navigator share skipped, falling back to download:", shareErr);
  }

  // Anchor download trigger
  const blobUrl = window.URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();

  // Mobile detection for fallback window.open
  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    setTimeout(() => {
      window.open(blobUrl, "_blank");
    }, 400);
  }

  setTimeout(() => {
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  }, 60000);

  return true;
}

/**
 * Convenience all-in-one function to generate and download/share the bill PDF.
 */
export async function downloadInvoicePdf(bill: BillData, shopkeeper?: any): Promise<boolean> {
  const invoiceNum = bill.invoice || bill.invoice_number || `INV-${Math.floor(1000 + Math.random() * 9000)}`;
  const cleanName = invoiceNum.replace(/[^a-zA-Z0-9_-]/g, "");
  const filename = `${cleanName || "invoice"}.pdf`;

  try {
    const blob = await generateInvoicePdfBlob(bill, shopkeeper);
    await downloadOrSharePdf(blob, filename);
    toast.success("Invoice PDF downloaded successfully!");
    return true;
  } catch (err) {
    console.error("Failed to generate or download invoice PDF:", err);
    toast.error("Could not download PDF. Please try again.");
    return false;
  }
}
