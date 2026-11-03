import React, { useState } from "react";
import {
  X,
  Banknote,
  QrCode,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  BookOpen,
  User,
  Phone,
  AlertCircle,
} from "lucide-react";

export type PaymentMode = "Cash" | "UPI" | "Card" | "Credit";

interface PaymentModeModalProps {
  amount: number;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  storeName: string;
  upiId?: string;
  onClose: () => void;
  onSelectPaymentMode: (
    mode: PaymentMode,
    status: "Paid" | "Pending",
    cashDetails?: { received: number; change: number },
    creditCustomer?: { name: string; phone: string }
  ) => void;
}

export default function PaymentModeModal({
  amount,
  invoiceNumber,
  customerName,
  customerPhone = "",
  storeName,
  upiId,
  onClose,
  onSelectPaymentMode,
}: PaymentModeModalProps) {
  const [selectedMode, setSelectedMode] = useState<PaymentMode>("Cash");
  const [cashReceived, setCashReceived] = useState<number>(amount);

  // Credit-specific mandatory fields
  const [creditName, setCreditName] = useState(customerName !== "Walk-in Customer" ? customerName : "");
  const [creditPhone, setCreditPhone] = useState(customerPhone || "");
  const [creditError, setCreditError] = useState("");

  const changeDue = Math.max(0, cashReceived - amount);

  const handleCashPreset = (added: number) => {
    setCashReceived((prev) => prev + added);
  };

  const handleConfirm = () => {
    if (selectedMode === "Cash") {
      onSelectPaymentMode("Cash", "Paid", {
        received: cashReceived,
        change: changeDue,
      });
    } else if (selectedMode === "UPI") {
      onSelectPaymentMode("UPI", "Paid");
    } else if (selectedMode === "Credit") {
      // Validate mandatory fields
      const nameOk = creditName.trim().length >= 2;
      const phoneOk = /^[6-9]\d{9}$/.test(creditPhone.trim());
      if (!nameOk || !phoneOk) {
        setCreditError(
          !nameOk
            ? "Customer name is required (min 2 characters)."
            : "Valid 10-digit mobile number is required for Pay Later."
        );
        return;
      }
      setCreditError("");
      onSelectPaymentMode("Credit", "Pending", undefined, {
        name: creditName.trim(),
        phone: creditPhone.trim(),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-md my-auto overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Compact Header */}
        <div className="shrink-0 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 px-5 py-3.5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-200">
              <Sparkles className="h-3.5 w-3.5" /> Select Payment Method
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-white/10 p-1 text-white/80 transition hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-white/10 px-3.5 py-2 backdrop-blur-sm">
            <div>
              <p className="text-[11px] text-violet-200">Customer</p>
              <p className="font-bold text-white text-xs truncate max-w-[180px]">
                {customerName || "Walk-in Customer"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-violet-200">Total Amount</p>
              <p className="text-lg font-black text-white">₹{amount}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Choose Payment Mode:
          </p>

          {/* Payment Methods Grid - Cash, UPI, and Udhar / Khata */}
          <div className="grid grid-cols-3 gap-2">
            {/* 1. Cash */}
            <button
              type="button"
              onClick={() => setSelectedMode("Cash")}
              className={`flex flex-col items-start p-2.5 rounded-xl border-2 text-left transition-all ${
                selectedMode === "Cash"
                  ? "border-emerald-500 bg-emerald-50/70 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    selectedMode === "Cash"
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Banknote className="h-4 w-4" />
                </div>
                {selectedMode === "Cash" && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                )}
              </div>
              <span className="font-bold text-slate-900 text-xs">Cash</span>
              <span className="text-[10px] text-slate-400 block truncate">
                Physical currency
              </span>
            </button>

            {/* 2. UPI / QR */}
            <button
              type="button"
              onClick={() => setSelectedMode("UPI")}
              className={`flex flex-col items-start p-2.5 rounded-xl border-2 text-left transition-all ${
                selectedMode === "UPI"
                  ? "border-violet-600 bg-violet-50/70 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    selectedMode === "UPI"
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <QrCode className="h-4 w-4" />
                </div>
                {selectedMode === "UPI" && (
                  <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0" />
                )}
              </div>
              <span className="font-bold text-slate-900 text-xs">UPI / QR</span>
              <span className="text-[10px] text-slate-400 block truncate">
                GPay, PhonePe
              </span>
            </button>

            {/* 3. Udhar / Khata */}
            <button
              type="button"
              onClick={() => { setSelectedMode("Credit"); setCreditError(""); }}
              className={`flex flex-col items-start p-2.5 rounded-xl border-2 text-left transition-all ${
                selectedMode === "Credit"
                  ? "border-amber-500 bg-amber-50/70 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    selectedMode === "Credit"
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                </div>
                {selectedMode === "Credit" && (
                  <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                )}
              </div>
              <span className="font-bold text-slate-900 text-xs">Udhar / Khata</span>
              <span className="text-[10px] text-slate-400 block truncate">
                Pay later credit
              </span>
            </button>
          </div>

          {/* Mode-Specific Details */}
          {selectedMode === "Cash" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                  Cash Received
                </label>
                <button
                  type="button"
                  onClick={() => setCashReceived(amount)}
                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  Exact (₹{amount})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  value={cashReceived || ""}
                  onChange={(e) => setCashReceived(Number(e.target.value))}
                  className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter cash customer gave"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {[50, 100, 200, 500].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleCashPreset(val)}
                    className="rounded-md bg-white border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-sm hover:bg-emerald-100 transition active:scale-95"
                  >
                    +₹{val}
                  </button>
                ))}
              </div>

              {/* Change calculation */}
              <div className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-emerald-100 text-xs">
                <span className="font-medium text-slate-600">
                  Change to Return:
                </span>
                <span className="font-black text-emerald-600 text-base">
                  ₹{changeDue}
                </span>
              </div>
            </div>
          )}

          {selectedMode === "UPI" && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-violet-800 font-bold text-xs uppercase tracking-wider">
                <QrCode className="h-4 w-4" /> Instant QR Code Payment
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Clicking confirm will open a dynamic, scannable UPI QR code for <span className="font-bold text-slate-900">₹{amount}</span> compatible with Google Pay, PhonePe, Paytm, and BHIM UPI apps.
              </p>
            </div>
          )}

          {selectedMode === "Credit" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <BookOpen className="h-4 w-4 text-amber-600" /> Digital Khata — Pay Later
              </div>

              {/* Mandatory customer info for credit */}
              <div className="rounded-lg border border-amber-300 bg-white p-3 space-y-2.5">
                <p className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Customer details are required for Pay Later
                </p>

                {/* Name */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Customer Name *
                  </label>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={creditName}
                      onChange={(e) => { setCreditName(e.target.value); setCreditError(""); }}
                      placeholder="e.g. Ravi Kumar"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Mobile Number * (10 digits)
                  </label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={creditPhone}
                      onChange={(e) => { setCreditPhone(e.target.value.replace(/\D/g, "")); setCreditError(""); }}
                      placeholder="e.g. 9876543210"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    />
                  </div>
                </div>

                {creditError && (
                  <p className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {creditError}
                  </p>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                This bill of <span className="font-bold text-slate-900">₹{amount}</span> will be added as <span className="font-bold text-amber-700">Udhar / Credit</span> in the customer's Khata account. You can send WhatsApp payment reminders anytime with 1 click.
              </p>
            </div>
          )}
        </div>

        {/* Compact Footer Actions */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-3 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-[2] flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white shadow-md transition ${
              selectedMode === "Cash"
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                : selectedMode === "Credit"
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                : "bg-violet-600 hover:bg-violet-700 shadow-violet-600/20"
            }`}
          >
            <span>
              {selectedMode === "Cash"
                ? `Confirm Cash (₹${amount})`
                : selectedMode === "Credit"
                ? `Record as Udhar (₹${amount})`
                : "Open UPI QR Code"}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
