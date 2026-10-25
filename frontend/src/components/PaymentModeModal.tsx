import React, { useState } from "react";
import {
  X,
  Banknote,
  QrCode,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export type PaymentMode = "Cash" | "UPI" | "Card" | "Credit";

interface PaymentModeModalProps {
  amount: number;
  invoiceNumber: string;
  customerName: string;
  storeName: string;
  upiId?: string;
  onClose: () => void;
  onSelectPaymentMode: (
    mode: PaymentMode,
    status: "Paid" | "Pending",
    cashDetails?: { received: number; change: number }
  ) => void;
}

export default function PaymentModeModal({
  amount,
  invoiceNumber,
  customerName,
  storeName,
  upiId,
  onClose,
  onSelectPaymentMode,
}: PaymentModeModalProps) {
  const [selectedMode, setSelectedMode] = useState<"Cash" | "UPI">("Cash");
  const [cashReceived, setCashReceived] = useState<number>(amount);

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

          {/* Payment Methods Grid - Cash and UPI */}
          <div className="grid grid-cols-2 gap-3">
            {/* 1. Cash */}
            <button
              type="button"
              onClick={() => setSelectedMode("Cash")}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                selectedMode === "Cash"
                  ? "border-emerald-500 bg-emerald-50/70 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  selectedMode === "Cash"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Banknote className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">Cash</span>
                  {selectedMode === "Cash" && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 block truncate">
                  Physical currency
                </span>
              </div>
            </button>

            {/* 2. UPI / QR */}
            <button
              type="button"
              onClick={() => setSelectedMode("UPI")}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                selectedMode === "UPI"
                  ? "border-violet-600 bg-violet-50/70 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  selectedMode === "UPI"
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <QrCode className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">UPI / QR</span>
                  {selectedMode === "UPI" && (
                    <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 block truncate">
                  GPay, PhonePe, Paytm
                </span>
              </div>
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
                : "bg-violet-600 hover:bg-violet-700 shadow-violet-600/20"
            }`}
          >
            <span>
              {selectedMode === "Cash" ? `Confirm Cash (₹${amount})` : "Open UPI QR Code"}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
