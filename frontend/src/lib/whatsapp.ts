import { toast } from "sonner";
import { generateInvoicePdfBlob, downloadOrSharePdf, downloadInvoicePdf } from "./pdfGenerator";

export interface InvoiceItem {
  product: string;
  quantity: number;
  unit_price: number;
  total?: number;
}

export interface InvoiceMessageParams {
  storeName: string;
  upiId?: string;
  items: InvoiceItem[];
  grandTotal: number;
  customerName?: string;
  invoiceNumber?: string;
  dateStr?: string;
  pdfUrl?: string;
}

export interface ShareInvoiceWhatsAppParams {
  bill: any;
  items?: InvoiceItem[];
  grandTotal?: number;
  customerName?: string;
  invoiceNumber?: string;
  shopkeeper?: any;
  phone?: string;
  forceWeb?: boolean;
  useSystemShareSheet?: boolean;
}

/**
 * Normalizes a phone number for WhatsApp:
 * - Strips all non-digit characters
 * - Removes leading 0s (e.g. 09876543210 -> 9876543210)
 * - If 10 digits, prepends India country code 91
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  // Remove leading zeros
  digits = digits.replace(/^0+/, "");
  // If 10 digits, default to India country code 91
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
}

/**
 * Validates whether the phone number has enough digits for WhatsApp.
 */
export function validatePhoneNumber(phone: string): {
  isValid: boolean;
  formattedPhone: string;
  error?: string;
} {
  const formatted = normalizePhoneNumber(phone);
  if (!formatted) {
    return {
      isValid: false,
      formattedPhone: "",
      error: "Please enter a customer mobile number.",
    };
  }
  if (formatted.length < 10) {
    return {
      isValid: false,
      formattedPhone: formatted,
      error: "Mobile number must be at least 10 digits.",
    };
  }
  return { isValid: true, formattedPhone: formatted };
}

/**
 * Checks if the current environment is a mobile browser or standalone PWA.
 */
export function isMobileOrPWA(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isMobileUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTouchDevice =
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
    window.matchMedia("(pointer: coarse)").matches;
  const isSmallScreen = window.innerWidth <= 820;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://");

  return isMobileUA || (isTouchDevice && isSmallScreen) || isStandalone;
}

/**
 * Builds a formatted WhatsApp message with store name, products, prices, and UPI payment details.
 */
export function buildInvoiceMessage({
  storeName,
  upiId = "qbill@upi",
  items,
  grandTotal,
  customerName,
  invoiceNumber,
  dateStr,
  pdfUrl,
}: InvoiceMessageParams): string {
  const cleanStoreName = storeName?.trim() || "QBill Store";
  const nowDisplay = dateStr || new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  let message = `*🛍️ ${cleanStoreName.toUpperCase()} - OFFICIAL INVOICE*\n`;
  if (invoiceNumber) {
    message += `*Invoice No:* ${invoiceNumber}\n`;
  }
  message += `*Date:* ${nowDisplay}\n`;
  if (customerName && customerName.trim() && customerName !== "Walk-in Customer") {
    message += `*Customer:* ${customerName.trim()}\n`;
  }
  message += `--------------------------------\n`;

  items.forEach((item, index) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    const lineTotal = qty * price;
    message += `${index + 1}. *${item.product}*\n`;
    message += `    Qty: ${qty} × ₹${price.toLocaleString("en-IN")} = *₹${lineTotal.toLocaleString("en-IN")}*\n`;
  });

  message += `--------------------------------\n`;
  message += `*💰 Grand Total: ₹${grandTotal.toLocaleString("en-IN")}*\n`;

  if (upiId) {
    message += `\n*💳 Pay via UPI:*\n`;
    const upiPayUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(cleanStoreName)}&am=${grandTotal}&cu=INR`;
    message += `UPI App: ${upiPayUrl}\n`;
    message += `UPI ID: *${upiId}*\n`;
  }

  if (pdfUrl) {
    message += `\n*📄 View & Download Bill PDF:*\n${pdfUrl}\n`;
  } else {
    message += `\n📄 *Official bill PDF generated & saved.*`;
  }

  message += `\nThank you for shopping with us! 🙏`;

  return message;
}

/**
 * Opens WhatsApp either via native protocol scheme (for mobile apps / PWAs)
 * or via WhatsApp Web (for desktop).
 */
export function openWhatsApp({
  phone,
  message,
  forceWeb = false,
}: {
  phone?: string;
  message: string;
  forceWeb?: boolean;
}): boolean {
  const cleanPhone = phone ? normalizePhoneNumber(phone) : "";
  const encodedText = encodeURIComponent(message);

  // App direct deep link
  const appUrl = cleanPhone
    ? `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
    : `whatsapp://send?text=${encodedText}`;

  // Web fallback links
  const webUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  const waMeUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  const mobile = isMobileOrPWA();

  if (forceWeb) {
    // User explicitly requested to open in browser / WhatsApp Web
    const win = window.open(waMeUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      window.location.href = waMeUrl;
    }
    return true;
  }

  if (mobile) {
    // MOBILE / PWA:
    // Direct navigation or anchor click triggers the OS intent to open the WhatsApp app
    try {
      const link = document.createElement("a");
      link.href = appUrl;
      link.target = "_top";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
        } catch {}
      }, 300);
    } catch {
      window.location.href = appUrl;
    }
  } else {
    // DESKTOP:
    const newWindow = window.open(webUrl, "_blank", "noopener,noreferrer");
    if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
      window.location.href = webUrl;
    }
  }

  return true;
}

/**
 * Copies the invoice text to clipboard with fallback.
 */
export async function copyInvoiceText(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      toast.success("Invoice copied to clipboard!");
      return true;
    }
  } catch {}

  // Fallback for older browsers or insecure origins
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    if (successful) {
      toast.success("Invoice copied to clipboard!");
      return true;
    }
  } catch {}

  toast.error("Could not copy invoice text.");
  return false;
}

/**
 * Shares both the Bill PDF AND the typed message directly to the customer's WhatsApp:
 * 1. Generates the thermal bill PDF Blob and saves/downloads it directly to the device.
 * 2. Directly opens WhatsApp to the customer's specific chat with the pre-typed invoice breakdown,
 *    grand total, UPI payment links, and online Bill PDF link.
 * 3. Does NOT show the generic OS "sharing options" sheet unless explicitly requested.
 */
export async function shareInvoiceOnWhatsApp({
  bill,
  items,
  grandTotal,
  customerName,
  invoiceNumber,
  shopkeeper,
  phone,
  forceWeb = false,
  useSystemShareSheet = false,
}: ShareInvoiceWhatsAppParams): Promise<boolean> {
  const invNum =
    invoiceNumber ||
    bill?.invoice ||
    bill?.invoice_number ||
    `INV-${Date.now().toString().slice(-6)}`;
  const custName =
    customerName || bill?.customer || bill?.customer_name || "Walk-in Customer";
  const rawItems = items || bill?.items || [];
  const normalizedItems: InvoiceItem[] = rawItems.map((it: any) => ({
    product: it.product || it.name || "Item",
    quantity: Number(it.quantity || it.qty || 1),
    unit_price: Number(it.unit_price || it.price || 0),
  }));

  const total =
    grandTotal !== undefined && grandTotal !== null
      ? grandTotal
      : parseFloat(String(bill?.amount || bill?.total || 0).replace(/[^\d.]/g, "")) || 0;

  const storeName =
    shopkeeper?.business_name || shopkeeper?.store_name || "QBill Store";
  const upiId = shopkeeper?.upi_id || "qbill@upi";

  const origin = typeof window !== "undefined" && window.location ? window.location.origin : "";
  const pdfUrl = origin ? `${origin}/invoice/${encodeURIComponent(invNum)}` : "";

  const message = buildInvoiceMessage({
    storeName,
    upiId,
    items: normalizedItems,
    grandTotal: total,
    customerName: custName,
    invoiceNumber: invNum,
    dateStr: bill?.time || bill?.created_at_formatted,
    pdfUrl,
  });

  const billObj = {
    ...bill,
    invoice: invNum,
    invoice_number: invNum,
    customer: custName,
    amount: `₹${total}`,
    items: normalizedItems,
  };

  const cleanName = invNum.replace(/[^a-zA-Z0-9_-]/g, "");
  const filename = `${cleanName || "invoice"}.pdf`;

  // 1. Generate the PDF blob
  let pdfBlob: Blob | null = null;
  try {
    pdfBlob = await generateInvoicePdfBlob(billObj, shopkeeper);
  } catch (pdfErr) {
    console.warn("Could not generate PDF blob for WhatsApp sharing:", pdfErr);
  }

  // 2. Only use system share sheet if explicitly requested
  if (
    useSystemShareSheet &&
    pdfBlob &&
    !forceWeb &&
    typeof navigator !== "undefined" &&
    typeof File !== "undefined" &&
    navigator.canShare
  ) {
    try {
      const file = new File([pdfBlob], filename, { type: "application/pdf" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${storeName} - ${invNum}`,
          text: message,
        });
        toast.success("Shared via system sheet!");
        return true;
      }
    } catch (shareErr: any) {
      if (shareErr.name === "AbortError") {
        return true;
      }
    }
  }

  // 3. Direct WhatsApp Send:
  // Auto-download PDF directly to the device so the user has the local file ready:
  if (pdfBlob) {
    try {
      await downloadOrSharePdf(pdfBlob, filename);
    } catch (e) {
      console.warn("PDF download notice:", e);
    }
  }

  // Direct open to customer's WhatsApp chat without OS share picker:
  openWhatsApp({
    phone,
    message,
    forceWeb,
  });

  toast.success("Opened WhatsApp directly to customer with bill & PDF link!");
  return true;
}
