import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Send,
  X,
  Copy,
  ExternalLink,
  User,
  Phone,
  Check,
  FileText,
  Download,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "../config/api";
import { getStoreCustomers, addStoreCustomer } from "../lib/offlineStore";
import {
  openWhatsApp,
  shareInvoiceOnWhatsApp,
  buildInvoiceMessage,
  copyInvoiceText,
  validatePhoneNumber,
  InvoiceItem,
  isMobileOrPWA,
} from "../lib/whatsapp";
import { downloadInvoicePdf } from "../lib/pdfGenerator";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InvoiceItem[];
  grandTotal: number;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  invoiceNumber?: string;
  shopkeeper: any;
  billData?: any;
  isCompletedBill?: boolean;
}

export default function WhatsAppModal({
  isOpen,
  onClose,
  items,
  grandTotal,
  initialCustomerName = "",
  initialCustomerPhone = "",
  invoiceNumber,
  shopkeeper,
  billData,
  isCompletedBill = false,
}: WhatsAppModalProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>(initialCustomerPhone);
  const [newCustomerName, setNewCustomerName] = useState<string>(initialCustomerName);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Sync initialCustomerName & initialCustomerPhone when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialCustomerName) {
        setNewCustomerName(initialCustomerName);
      }
      if (initialCustomerPhone) {
        setNewCustomerPhone(initialCustomerPhone);
      }
      // Fetch customers
      axios
        .get(apiUrl("/api/customers/"), {
          params: { shopkeeper_email: shopkeeper?.email },
          timeout: 2500,
        })
        .then((res) => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setCustomers(res.data);
          } else {
            setCustomers(getStoreCustomers(shopkeeper?.email));
          }
        })
        .catch(() => {
          setCustomers(getStoreCustomers(shopkeeper?.email));
        });
    }
  }, [isOpen, initialCustomerName, initialCustomerPhone, shopkeeper?.email]);

  if (!isOpen) return null;

  const selectedCustomer = customers.find(
    (c) => c.id?.toString() === selectedCustomerId
  );

  const getTargetPhone = (): string => {
    if (selectedCustomer) return selectedCustomer.phone;
    return newCustomerPhone.trim();
  };

  const getCustomerDisplayName = (): string => {
    if (selectedCustomer) return selectedCustomer.name;
    return newCustomerName.trim() || initialCustomerName.trim() || "Walk-in Customer";
  };

  const currentInvoiceNum =
    invoiceNumber ||
    billData?.invoice ||
    billData?.invoice_number ||
    `INV-${Math.floor(1000 + Math.random() * 9000)}`;

  const generateMessage = (): string => {
    const storeName =
      shopkeeper?.business_name || shopkeeper?.store_name || "QBill Store";
    const upiId = (shopkeeper as any)?.upi_id || "qbill@upi";

    return buildInvoiceMessage({
      storeName,
      upiId,
      items,
      grandTotal,
      customerName: getCustomerDisplayName(),
      invoiceNumber: currentInvoiceNum,
    });
  };

  const getConstructedBillData = () => {
    return {
      ...(billData || {}),
      invoice: currentInvoiceNum,
      invoice_number: currentInvoiceNum,
      customer: getCustomerDisplayName(),
      customer_name: getCustomerDisplayName(),
      amount: `₹${grandTotal}`,
      grand_total: grandTotal,
      items: items,
      phone: getTargetPhone(),
      customer_phone: getTargetPhone(),
    };
  };

  const handleSendWithPdf = async (forceWeb: boolean = false) => {
    const rawPhone = getTargetPhone();
    const validation = validatePhoneNumber(rawPhone);

    if (!validation.isValid) {
      toast.error(validation.error || "Please enter a valid mobile number.");
      return;
    }

    setIsSharing(true);
    const finalCustomerName = getCustomerDisplayName();

    // If new customer details were entered, save in background
    if (!selectedCustomer && newCustomerPhone.trim()) {
      const payload = {
        name: finalCustomerName,
        phone: validation.formattedPhone,
        initials: finalCustomerName.substring(0, 2).toUpperCase(),
        tone: "violet",
        shopkeeper_email: shopkeeper?.email,
      };

      axios
        .post(apiUrl("/api/customers/"), payload, { timeout: 2500 })
        .catch(() => {
          addStoreCustomer(payload, shopkeeper?.email);
        });
    }

    try {
      const billToShare = getConstructedBillData();
      await shareInvoiceOnWhatsApp({
        bill: billToShare,
        items,
        grandTotal,
        customerName: finalCustomerName,
        invoiceNumber: currentInvoiceNum,
        shopkeeper,
        phone: validation.formattedPhone,
        forceWeb,
      });
      onClose();
    } catch (err) {
      console.error("Error sharing invoice via WhatsApp:", err);
      toast.error("Could not trigger WhatsApp share.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadOnly = async () => {
    setIsDownloading(true);
    try {
      const billToDownload = getConstructedBillData();
      await downloadInvoicePdf(billToDownload, shopkeeper);
    } catch {
      toast.error("Failed to download PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = async () => {
    const message = generateMessage();
    const success = await copyInvoiceText(message);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isMobile = isMobileOrPWA();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-5 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title & Badge */}
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#25D366] shadow-sm">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 leading-tight">
                {isCompletedBill ? "Bill Completed! Send via WhatsApp" : "Send Bill via WhatsApp"}
              </h2>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
                {currentInvoiceNum}
              </span>
              <span>•</span>
              <span>
                Total: <strong className="text-slate-900">₹{grandTotal}</strong>
              </span>
              <span>•</span>
              <span>{items.length} item{items.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {/* PDF + Typing Message Info Card */}
        <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-900 flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[11px] uppercase tracking-wide text-emerald-800">
              PDF & Typing Message Ready
            </p>
            <p className="text-[11px] text-emerald-700 leading-tight">
              Sends receipt PDF with itemized products, quantities, prices & UPI link.
            </p>
          </div>
        </div>

        <div className="space-y-3.5">
          {/* Select Existing Customer */}
          {customers.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Select Saved Customer
              </label>
              <div className="relative">
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white transition"
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    if (e.target.value) {
                      setNewCustomerPhone("");
                    }
                  }}
                >
                  <option value="">-- Choose from saved customers --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id?.toString()}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {customers.length > 0 && (
            <div className="relative flex items-center py-0.5">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink-0 mx-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                OR DIRECT NUMBER
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>
          )}

          {/* Customer Mobile Number */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-emerald-600" /> Customer WhatsApp Number *
              </span>
              <span className="text-[10px] text-slate-400 font-normal">10 digits</span>
            </label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="e.g. 9876543210"
              value={newCustomerPhone}
              disabled={Boolean(selectedCustomerId)}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500 focus:bg-white disabled:opacity-50 transition"
            />
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-slate-400" /> Customer Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Customer Name"
              value={newCustomerName}
              disabled={Boolean(selectedCustomerId)}
              onChange={(e) => setNewCustomerName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white disabled:opacity-50 transition"
            />
          </div>

          {/* Toggle Message Preview */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
            >
              {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPreview ? "Hide Typed Message Preview" : "Preview WhatsApp Typing Message"}
            </button>

            {showPreview && (
              <pre className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                {generateMessage()}
              </pre>
            )}
          </div>
        </div>

        {/* Primary Action Button: Send PDF & Message */}
        <button
          type="button"
          onClick={() => handleSendWithPdf(false)}
          disabled={isSharing}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-sm font-black text-white shadow-lg shadow-[#25D366]/30 transition hover:bg-[#20bd5a] active:scale-[0.98] disabled:opacity-60"
        >
          {isSharing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing & Launching WhatsApp...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Bill PDF & Message via WhatsApp
            </>
          )}
        </button>

        {/* Secondary Actions: Download PDF, Copy Text, WhatsApp Web */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDownloadOnly}
            disabled={isDownloading}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-[0.98]"
          >
            <Download className="h-3.5 w-3.5 text-violet-600" />
            {isDownloading ? "Downloading..." : "Download PDF"}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied Text!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" /> Copy Text
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleSendWithPdf(true)}
          disabled={isSharing}
          className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          {isMobile ? "Open in WhatsApp Web / Browser" : "Launch WhatsApp Web directly"}
        </button>

        {isCompletedBill && (
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition"
          >
            Done (Skip WhatsApp)
          </button>
        )}
      </div>
    </div>
  );
}
