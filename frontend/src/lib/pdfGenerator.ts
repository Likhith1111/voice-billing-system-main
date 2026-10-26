import jsPDF from "jspdf";
import axios from "axios";
import { apiUrl } from "../config/api";
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
  items?: InvoiceItem[];
}


// ─── Helpers ───────────────────────────────────────────────────────────────────
function dashedLine(doc: jsPDF, x1: number, y: number, x2: number) {
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.2);
  doc.line(x1, y, x2, y);
  doc.setLineDashPattern([], 0);
}

function solidLine(doc: jsPDF, x1: number, y: number, x2: number, thick = 0.5) {
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(thick);
  doc.line(x1, y, x2, y);
  doc.setLineWidth(0.2);
}

function fmtRs(val: number): string {
  return `\u20b9${val.toFixed(2)}`;
}

/**
 * Generates a thermal-receipt style PDF blob matching the restaurant bill template.
 * Narrow 80mm receipt: store header, bill info, item table with QTY/UNIT/TOTAL,
 * CGST+SGST breakdown, bold GRAND TOTAL, customer/payment footer, THANK YOU.
 */
export async function generateInvoicePdfBlob(bill: BillData, shopkeeper?: any): Promise<Blob> {
  const invoiceNum = bill.invoice || bill.invoice_number || `INV-${Math.floor(1000 + Math.random() * 9000)}`;
  const customerName = bill.customer || bill.customer_name || "Walk-in Customer";
  const customerPhone = bill.phone || bill.customer_phone || "";
  const grandTotal = parseAmount(bill.amount || bill.total || bill.grand_total || 0);
  const paymentMode = bill.payment_mode || "Cash";
  const status = bill.status || "Paid";

  const rawItems: InvoiceItem[] = Array.isArray(bill.items) && bill.items.length > 0
    ? bill.items
    : [{ product: "Retail Purchase", quantity: 1, unit_price: grandTotal, total: grandTotal }];

  // 1. Try backend generation with short timeout
  try {
    const response = await axios.post(
      apiUrl("/api/generate-bill/"),
      { items: rawItems, grand_total: grandTotal, customer_name: customerName, customer_phone: customerPhone, invoice_number: invoiceNum },
      { responseType: "blob", timeout: 2500 }
    );
    if (response.data && response.data.size > 100) {
      return new Blob([response.data], { type: "application/pdf" });
    }
  } catch {
    console.info("Using client-side PDF engine for invoice:", invoiceNum);
  }

  // 2. Client-side thermal receipt — 80mm wide
  const W = 80;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [W, 300] });

  const storeName = (shopkeeper?.store_name || shopkeeper?.business_name || "QBill Smart Store").toUpperCase();
  const storeAddress = shopkeeper?.address || "Your Store Address";
  const storePhone = shopkeeper?.phone ? `Ph: ${shopkeeper.phone}` : "";
  const storeUpi = shopkeeper?.upi_id || "";
  const gstin = shopkeeper?.gstin || "";

  const billedDate = bill.created_at ? new Date(bill.created_at) : new Date();
  const dateStr = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(billedDate);
  const timeStr = bill.time || new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(billedDate);

  const ML = 5;   // margin left
  const MR = W - 5; // margin right
  const CX = W / 2; // center

  let y = 7;

  // ── Store icon box (fork/store symbol) ───────────────────────────────────────
  doc.setDrawColor(0);
  doc.setLineWidth(0.6);
  doc.roundedRect(CX - 6, y, 12, 12, 2, 2, "S");
  doc.setLineWidth(0.5);
  doc.line(CX, y + 2.5, CX, y + 9);       // center vertical
  doc.line(CX - 2.5, y + 2.5, CX - 2.5, y + 5.5); // left prong
  doc.line(CX + 2.5, y + 2.5, CX + 2.5, y + 5.5); // right prong
  doc.line(CX - 2.5, y + 5.5, CX + 2.5, y + 5.5); // crossbar
  doc.setLineWidth(0.2);
  y += 15;

  // ── Store name ───────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(storeName, CX, y, { align: "center", charSpace: 1.2 });
  y += 5;

  // ── Tagline ──────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(50);
  doc.text("GOOD FOOD. GREAT MEMORIES.", CX, y, { align: "center", charSpace: 0.5 });
  y += 4;

  // ── Short lines flanking address ─────────────────────────────────────────────
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(ML, y, ML + 8, y);
  doc.line(MR - 8, y, MR, y);
  y += 4;

  // ── Address ──────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(40);
  const addrLines = doc.splitTextToSize(storeAddress, W - 16);
  addrLines.forEach((line: string) => { doc.text(line, CX, y, { align: "center" }); y += 3.8; });
  if (storePhone) { doc.text(storePhone, CX, y, { align: "center" }); y += 3.8; }

  // ── GSTIN / UPI ──────────────────────────────────────────────────────────────
  if (gstin || storeUpi) {
    y += 1;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(0);
    doc.text(`GSTIN: ${gstin || storeUpi}`, CX, y, { align: "center" });
    y += 5;
  } else {
    y += 3;
  }

  // ── Dashed separator ─────────────────────────────────────────────────────────
  dashedLine(doc, ML, y, MR); y += 5;

  // ── Bill info rows ────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(0);

  const COL_COLON = ML + 22;
  const infoRows: [string, string][] = [
    ["Bill No.", invoiceNum],
    ["Date", dateStr],
    ["Time", timeStr],
    ["Payment Mode", paymentMode],
  ];

  infoRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.text(label, ML, y);
    doc.text(":", COL_COLON, y);
    doc.text(value, MR, y, { align: "right" });
    y += 4.5;
  });

  y += 1;
  dashedLine(doc, ML, y, MR); y += 5;

  // ── Items table header ────────────────────────────────────────────────────────
  const QTY_X = ML + 33;
  const UNIT_X = ML + 49;
  const TOTAL_X = MR;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(0);
  doc.text("ITEM", ML, y);
  doc.text("QTY", QTY_X, y, { align: "center" });
  doc.text("UNIT", UNIT_X, y, { align: "center" });
  doc.text("TOTAL", TOTAL_X, y, { align: "right" });
  y += 2.5;

  dashedLine(doc, ML, y, MR); y += 4;

  // ── Item rows ─────────────────────────────────────────────────────────────────
  let subtotalCalc = 0;
  rawItems.forEach((item, idx) => {
    const qty = Number(item.quantity) || 1;
    const price = parseAmount(item.unit_price || 0);
    const lineTotal = parseAmount(item.total || qty * price);
    subtotalCalc += lineTotal;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(0);

    const label = `${idx + 1}. ${item.product}`;
    const nameLines = doc.splitTextToSize(label, 28);
    doc.text(nameLines, ML, y);
    doc.text(String(qty), QTY_X, y, { align: "center" });
    doc.text(fmtRs(price), UNIT_X, y, { align: "center" });
    doc.text(fmtRs(lineTotal), TOTAL_X, y, { align: "right" });
    y += nameLines.length > 1 ? nameLines.length * 4 : 5;
  });

  y += 1;
  dashedLine(doc, ML, y, MR); y += 5;

  // ── Tax breakdown ─────────────────────────────────────────────────────────────
  const finalGrand = grandTotal > 0 ? grandTotal : subtotalCalc;
  // Back-calculate pre-tax subtotal assuming 5% total GST
  const preTax = finalGrand / 1.05;
  const cgst = preTax * 0.025;
  const sgst = preTax * 0.025;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(0);

  const taxRows: [string, number][] = [
    ["SUBTOTAL", preTax],
    ["CGST (2.5%)", cgst],
    ["SGST (2.5%)", sgst],
  ];
  taxRows.forEach(([label, value]) => {
    doc.text(label, ML, y);
    doc.text(fmtRs(value), TOTAL_X, y, { align: "right" });
    y += 4.5;
  });

  y += 2;

  // ── Grand total ───────────────────────────────────────────────────────────────
  solidLine(doc, ML, y, MR, 0.7); y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("GRAND TOTAL", ML, y);
  doc.text(fmtRs(finalGrand), TOTAL_X, y, { align: "right" });
  y += 3;
  solidLine(doc, ML, y, MR, 0.7); y += 6;

  // ── Dashed separator ──────────────────────────────────────────────────────────
  dashedLine(doc, ML, y, MR); y += 5;

  // ── Customer info ─────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(0);
  doc.text("Customer Name", ML, y);
  doc.text(":", COL_COLON, y);
  doc.text(customerName, TOTAL_X, y, { align: "right" });
  y += 4.5;

  if (customerPhone) {
    doc.text("Phone", ML, y);
    doc.text(":", COL_COLON, y);
    doc.text(customerPhone, TOTAL_X, y, { align: "right" });
    y += 4.5;
  }

  y += 1;
  dashedLine(doc, ML, y, MR); y += 5;

  // ── Payment status & mode ─────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Payment Status", ML, y);
  doc.setFont("helvetica", "bold");
  doc.text(status.toUpperCase(), TOTAL_X, y, { align: "right" });
  y += 4.5;

  doc.setFont("helvetica", "normal");
  doc.text("Payment Mode", ML, y);
  doc.setFont("helvetica", "bold");
  doc.text(paymentMode.toUpperCase(), TOTAL_X, y, { align: "right" });
  y += 6;

  // ── "Thank you, visit again!" ─────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.text("THANK YOU, VISIT AGAIN!", CX, y, { align: "center" });
  y += 5;

  // ── Decorative star divider ───────────────────────────────────────────────────
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(CX - 12, y, CX - 4, y);
  doc.setFillColor(0);
  doc.circle(CX, y, 0.8, "F");
  doc.line(CX + 4, y, CX + 12, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text("THANK YOU", CX, y, { align: "center" });
  y += 4;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(60);
  doc.text("Visit Again!", CX, y, { align: "center" });

  return doc.output("blob");
}

/**
 * Downloads or shares a PDF Blob on mobile devices and desktops.
 * Handles iOS Safari, Android Chrome, mobile webviews, and desktop browsers gracefully.
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
      // User dismissed share sheet, consider completed
      return true;
    }
    console.warn("Navigator share failed, falling back to download:", shareErr);
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
    // On iOS Safari where blob download is blocked, also open in a new tab
    setTimeout(() => {
      window.open(blobUrl, "_blank");
    }, 400);
  }

  // Clean up URL object after delay to avoid cancelling active download
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
