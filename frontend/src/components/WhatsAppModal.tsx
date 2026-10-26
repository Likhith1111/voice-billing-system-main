import React, { useState, useEffect } from "react";
import axios from "axios";
import { Send, X, Copy, ExternalLink, User, Phone, Check } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "../config/api";
import { getStoreCustomers, addStoreCustomer } from "../lib/offlineStore";
import {
  openWhatsApp,
  buildInvoiceMessage,
  copyInvoiceText,
  validatePhoneNumber,
  InvoiceItem,
  isMobileOrPWA,
} from "../lib/whatsapp";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InvoiceItem[];
  grandTotal: number;
  initialCustomerName?: string;
  invoiceNumber?: string;
  shopkeeper: any;
}

export default function WhatsAppModal({
  isOpen,
  onClose,
  items,
  grandTotal,
  initialCustomerName = "",
  invoiceNumber,
  shopkeeper,
}: WhatsAppModalProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>("");
  const [newCustomerName, setNewCustomerName] = useState<string>(initialCustomerName);
  const [copied, setCopied] = useState(false);

  // Sync initialCustomerName when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialCustomerName && !newCustomerName) {
        setNewCustomerName(initialCustomerName);
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
  }, [isOpen, initialCustomerName, shopkeeper?.email]);

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
    return newCustomerName.trim() || initialCustomerName.trim() || "Customer";
  };

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
      invoiceNumber,
    });
  };

  const handleSend = (forceWeb: boolean = false) => {
    const rawPhone = getTargetPhone();
    const validation = validatePhoneNumber(rawPhone);

    if (!validation.isValid) {
      toast.error(validation.error || "Please enter a valid mobile number.");
      return;
    }

    const message = generateMessage();
    const finalCustomerName = getCustomerDisplayName();

    // If new customer details were entered, save in background (DO NOT await!)
    // Preserves transient user gesture so popup blockers do not block WhatsApp on mobile.
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

    // Trigger WhatsApp
    toast.success("Opening WhatsApp…");
    openWhatsApp({
      phone: validation.formattedPhone,
      message,
      forceWeb,
    });

    onClose();
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
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#25D366]">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 leading-tight">
              Send via WhatsApp
            </h2>
            <p className="text-xs text-slate-500">
              Total Amount: <span className="font-bold text-slate-900">₹{grandTotal}</span> ({items.length} items)
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Select Existing Customer */}
          {customers.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Select Existing Customer
              </label>
              <div className="relative">
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white transition"
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
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink-0 mx-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                OR ENTER DETAILS
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>
          )}

          {/* New Customer Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-emerald-600" /> Mobile Number *
            </label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="e.g. 9876543210"
              value={newCustomerPhone}
              disabled={Boolean(selectedCustomerId)}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium outline-none focus:border-emerald-500 focus:bg-white disabled:opacity-50 transition"
            />
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-slate-400" /> Customer Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Customer Name"
              value={newCustomerName}
              disabled={Boolean(selectedCustomerId)}
              onChange={(e) => setNewCustomerName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white disabled:opacity-50 transition"
            />
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={() => handleSend(false)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 transition hover:bg-[#20bd5a] active:scale-[0.98]"
        >
          <Send className="h-4 w-4" />
          Send Invoice
        </button>

        {/* Secondary Actions: Web Fallback & Copy */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" /> Copy Invoice Text
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSend(true)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-[0.98]"
            title="Open using WhatsApp Web in your browser"
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
            {isMobile ? "Open via Web" : "WhatsApp Web"}
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-slate-400">
          Directly launches WhatsApp on Android & iOS mobile devices.
        </p>
      </div>
    </div>
  );
}
