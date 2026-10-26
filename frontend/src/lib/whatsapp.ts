import { toast } from "sonner";

export interface InvoiceItem {
  product: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceMessageParams {
  storeName: string;
  upiId?: string;
  items: InvoiceItem[];
  grandTotal: number;
  customerName?: string;
  invoiceNumber?: string;
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
}: InvoiceMessageParams): string {
  const cleanStoreName = storeName?.trim() || "QBill Store";
  let message = `*🛍️ ${cleanStoreName} Invoice*\n`;
  if (invoiceNumber) {
    message += `*Invoice No:* ${invoiceNumber}\n`;
  }
  if (customerName && customerName.trim() && customerName !== "Walk-in Customer") {
    message += `*Customer:* ${customerName.trim()}\n`;
  }
  message += `\n`;

  items.forEach((item, index) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    message += `${index + 1}. *${item.product}*\n`;
    message += `    Qty: ${qty} × ₹${price} = ₹${qty * price}\n`;
  });

  message += `\n*Grand Total: ₹${grandTotal}*\n`;
  message += `\n*💳 Payment Options:*\n`;

  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(cleanStoreName)}&am=${grandTotal}&cu=INR`;
  message += `1. Pay via UPI App: ${upiPayUrl}\n`;
  message += `2. Or Pay to UPI ID: ${upiId}\n`;
  message += `\nThank you for shopping with us! 🙏`;

  return message;
}

/**
 * Opens WhatsApp either via native protocol scheme (for mobile apps / PWAs)
 * or via WhatsApp Web (for desktop).
 *
 * CRITICAL FIX FOR MOBILE:
 * - On mobile/PWAs, window.open(..., '_blank') is blocked by popup blockers,
 *   especially in standalone PWAs or if called after any async delay.
 * - Calling 'whatsapp://send' directly via anchor click or location.href
 *   launches the native WhatsApp application reliably on iOS and Android.
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
      // If popup blocker blocked it on desktop, fall back to navigating or wa.me
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
