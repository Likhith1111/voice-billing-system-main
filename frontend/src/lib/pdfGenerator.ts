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

/**
 * Generates an official, beautiful PDF blob for a bill.
 * Tries the backend API first, but seamlessly falls back to client-side jsPDF
 * so it works 100% offline, on mobile devices, or in cloud deployments.
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
      {
        items: rawItems,
        grand_total: grandTotal,
        customer_name: customerName,
        customer_phone: customerPhone,
        invoice_number: invoiceNum,
      },
      {
        responseType: "blob",
        timeout: 2500,
      }
    );
    if (response.data && response.data.size > 100) {
      return new Blob([response.data], { type: "application/pdf" });
    }
  } catch (err) {
    // Backend unavailable or slow; proceed to client-side jsPDF fallback
    console.info("Using client-side PDF engine for invoice:", invoiceNum);
  }

  // 2. Client-side jsPDF generation
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const storeName = shopkeeper?.store_name || shopkeeper?.business_name || "QBill Smart Store";
  const storeOwner = shopkeeper?.name || "Shopkeeper";
  const storePhone = shopkeeper?.phone || "";
  const storeAddress = shopkeeper?.address || "";
  const storeUpi = shopkeeper?.upi_id || "";

  // Date formatting
  const dateStr = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(bill.created_at ? new Date(bill.created_at) : new Date());

  const timeStr = bill.time || new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());

  // Top header banner
  doc.setFillColor(16, 20, 43); // Dark indigo background
  doc.rect(0, 0, pageWidth, 42, "F");

  // Store Brand Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(storeName, 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(199, 210, 254);
  const subline = [storeOwner, storePhone, storeAddress].filter(Boolean).join("  •  ");
  doc.text(subline || "AI-Powered Billing & POS", 14, 25);
  if (storeUpi) {
    doc.text(`UPI: ${storeUpi}`, 14, 31);
  }

  // Right-aligned Invoice Badge
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("TAX INVOICE", pageWidth - 14, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(165, 180, 252);
  doc.text(invoiceNum, pageWidth - 14, 25, { align: "right" });
  doc.setFontSize(8);
  doc.text(`${dateStr} • ${timeStr}`, pageWidth - 14, 31, { align: "right" });

  // Bill To Section
  let y = 52;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 20, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("BILLED TO", 20, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(customerName, 20, y + 13);

  if (customerPhone) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Phone: ${customerPhone}`, 20, y + 17);
  }

  // Payment Badge on right of Billed To
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("PAYMENT", pageWidth - 20, y + 6, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // emerald
  doc.text(`${status.toUpperCase()} (${paymentMode})`, pageWidth - 20, y + 13, { align: "right" });

  // Items Table Header
  y = 80;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("#", 18, y + 5.5);
  doc.text("ITEM DESCRIPTION", 28, y + 5.5);
  doc.text("QTY", 120, y + 5.5, { align: "center" });
  doc.text("PRICE (Rs.)", 152, y + 5.5, { align: "right" });
  doc.text("TOTAL (Rs.)", pageWidth - 18, y + 5.5, { align: "right" });

  y += 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  let calculatedSum = 0;
  rawItems.forEach((item, idx) => {
    const qty = Number(item.quantity) || 1;
    const price = parseAmount(item.unit_price || 0);
    const lineTotal = parseAmount(item.total || (qty * price));
    calculatedSum += lineTotal;

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, pageWidth - 28, 8, "F");
    }

    doc.setTextColor(100, 116, 139);
    doc.text(String(idx + 1), 18, y + 1.5);

    doc.setTextColor(15, 23, 42);
    // Truncate long product names
    const productName = item.product.length > 40 ? item.product.slice(0, 38) + "…" : item.product;
    doc.text(productName, 28, y + 1.5);

    doc.text(String(qty), 120, y + 1.5, { align: "center" });
    doc.text(price.toLocaleString("en-IN"), 152, y + 1.5, { align: "right" });
    doc.text(lineTotal.toLocaleString("en-IN"), pageWidth - 18, y + 1.5, { align: "right" });

    y += 8;
  });

  const finalTotal = grandTotal > 0 ? grandTotal : calculatedSum;

  // Divider
  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  // Grand Total Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(pageWidth - 85, y, 71, 18, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("GRAND TOTAL:", pageWidth - 78, y + 7);

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${finalTotal.toLocaleString("en-IN")}`, pageWidth - 18, y + 13, { align: "right" });

  // Footer notes
  y = 265;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Thank you for shopping with us! 🙏", pageWidth / 2, y + 7, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("This is a computer-generated tax invoice verified by QBill AI.", pageWidth / 2, y + 12, { align: "center" });

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
