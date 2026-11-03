import React, { useState, useEffect } from "react";
import {
  BookOpen,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Clock,
  Calendar,
  Package,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Banknote,
  Search,
  IndianRupee,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../App";
import {
  getStorePayLaterCustomers,
  settleCustomerPayLater,
  type PayLaterCustomer,
  type PayLaterVisit,
} from "../lib/offlineStore";
import { openWhatsApp } from "../lib/whatsapp";

export default function PayLaterSection() {
  const { shopkeeper } = useAuth();
  const [payLaterCustomers, setPayLaterCustomers] = useState<PayLaterCustomer[]>([]);
  const [expandedCustomerKey, setExpandedCustomerKey] = useState<string | null>(null);

  // Collect Payment Modal State
  const [collectModalCustomer, setCollectModalCustomer] = useState<PayLaterCustomer | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>("");
  const [collectMode, setCollectMode] = useState<"Cash" | "UPI">("Cash");
  const [collectNote, setCollectNote] = useState<string>("");

  const refreshPayLaterData = () => {
    const list = getStorePayLaterCustomers(shopkeeper?.email);
    setPayLaterCustomers(list);
  };

  useEffect(() => {
    refreshPayLaterData();

    // Re-fetch automatically when bills/khata update
    const handleBillAdded = () => {
      refreshPayLaterData();
    };

    window.addEventListener("qbill-bill-added", handleBillAdded);
    window.addEventListener("storage", handleBillAdded);

    return () => {
      window.removeEventListener("qbill-bill-added", handleBillAdded);
      window.removeEventListener("storage", handleBillAdded);
    };
  }, [shopkeeper?.email]);

  const toggleExpand = (key: string) => {
    setExpandedCustomerKey((prev) => (prev === key ? null : key));
  };

  // Open Collect Payment Modal
  const handleOpenCollect = (cust: PayLaterCustomer, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollectModalCustomer(cust);
    setCollectAmount(String(cust.totalDue));
    setCollectMode("Cash");
    setCollectNote("Pay Later repayment");
  };

  // Submit Payment Collection
  const handleConfirmCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectModalCustomer) return;

    const amt = parseFloat(collectAmount);
    if (!amt || amt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    settleCustomerPayLater(
      collectModalCustomer.customerPhone,
      collectModalCustomer.customerName,
      amt,
      collectMode,
      collectNote,
      shopkeeper?.email
    );

    toast.success(
      `Collected ₹${amt.toLocaleString("en-IN")} via ${collectMode} from ${collectModalCustomer.customerName}!`,
      { duration: 4000 }
    );

    setCollectModalCustomer(null);
    refreshPayLaterData();
  };

  // 1-Click WhatsApp Payment Reminder with item list
  const handleSendReminder = (cust: PayLaterCustomer, e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = cust.customerPhone;
    if (!phone) {
      toast.error("Customer phone number not available for WhatsApp reminder.");
      return;
    }

    const storeName = shopkeeper?.store_name || "Our Grocery Store";
    const upiId = shopkeeper?.upi_id || "9704955713-2@ybl";
    const upiPayLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${cust.totalDue}&cu=INR`;

    // Build multi-visit items text
    let visitsSummary = "";
    cust.visits.forEach((v, idx) => {
      const itemsText = v.items
        .map((i) => `  • ${i.product} (Qty: ${i.quantity}) - ₹${i.total}`)
        .join("\n");
      visitsSummary += `\n*Visit ${idx + 1} (${v.date}${v.time ? ` at ${v.time}` : ""}) - ₹${v.amount}*\n${itemsText}\n`;
    });

    const message =
      `Namaste ${cust.customerName} ji 🙏\n\n` +
      `Gentle payment reminder from *${storeName}*.\n` +
      `Your pending *Pay Later / Udhar* balance is: *₹${cust.totalDue.toLocaleString("en-IN")}*\n` +
      `Number of Pay Later visits: *${cust.visitCount}*\n` +
      `---------------------------------\n` +
      `*Purchased Items Breakdown:*` +
      `${visitsSummary}\n` +
      `---------------------------------\n` +
      `💳 *Pay easily via UPI:*\n` +
      `UPI ID: *${upiId}*\n` +
      `Pay Link: ${upiPayLink}\n\n` +
      `Thank you for shopping with us! 🙏`;

    openWhatsApp(phone, message);
    toast.success(`WhatsApp reminder opened for ${cust.customerName}!`);
  };

  const totalOutstandingAll = payLaterCustomers.reduce((acc, c) => acc + c.totalDue, 0);
  const activeDebtorsCount = payLaterCustomers.filter((c) => c.totalDue > 0).length;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6 mb-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-200">
              <BookOpen className="h-4 w-4" />
            </div>
            <h2 className="font-display text-[16px] font-bold tracking-tight text-slate-950 flex items-center gap-2">
              Pay Later &amp; Udhar List
              {activeDebtorsCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                  {activeDebtorsCount} Pending
                </span>
              )}
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Track customer credit · Multi-visit itemized breakdown with date, time &amp; instant collection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-1.5 text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-rose-500">
              Total Outstanding
            </p>
            <p className="text-sm font-black text-rose-700">
              ₹{totalOutstandingAll.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="mt-4 space-y-3">
        {payLaterCustomers.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <BookOpen className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="font-bold text-slate-600">No Pay Later records</p>
            <p className="text-[11px] mt-0.5">When customers purchase items on credit, they will appear here.</p>
          </div>
        ) : (
          payLaterCustomers.map((cust) => {
            const customerKey = cust.customerPhone || cust.customerName;
            const isExpanded = expandedCustomerKey === customerKey;
            const hasDue = cust.totalDue > 0;

            return (
              <div
                key={customerKey}
                className="overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50/50 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                {/* Main Customer Row */}
                <div
                  onClick={() => toggleExpand(customerKey)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 cursor-pointer select-none"
                >
                  {/* Left: Customer Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 font-black text-white text-xs shadow-sm">
                      {cust.customerName
                        ? cust.customerName.substring(0, 2).toUpperCase()
                        : "CU"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-xs truncate">
                          {cust.customerName}
                        </h4>
                        {/* Multi-Visit Badge */}
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                          <Clock className="h-3 w-3 text-amber-600" />
                          {cust.visitCount} Pay Later {cust.visitCount === 1 ? "visit" : "visits"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {cust.customerPhone || "No phone registered"}
                      </p>
                    </div>
                  </div>

                  {/* Right: Balance & Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Balance Due
                      </p>
                      <p
                        className={`text-sm font-black ${
                          hasDue ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {hasDue ? `₹${cust.totalDue.toLocaleString("en-IN")}` : "₹0 (Settled)"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {hasDue && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleSendReminder(cust, e)}
                            className="flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageSquare className="h-3 w-3 text-emerald-600" />
                            <span className="hidden md:inline">WhatsApp</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenCollect(cust, e)}
                            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
                          >
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                            Collect
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleExpand(customerKey)}
                        className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100"
                        title={isExpanded ? "Collapse visits" : "View visits and items"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Multi-Visit Breakdown with Date, Time, and Exact Items */}
                {isExpanded && (
                  <div className="border-t border-slate-200/80 bg-white p-4 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-violet-600" />
                        Pay Later Visits Breakdown ({cust.visits.length})
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Click Collect to record payment
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {cust.visits.map((visit, vIdx) => (
                        <div
                          key={visit.id || vIdx}
                          className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                        >
                          {/* Visit Header: Date, Time & Amount */}
                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white text-[10px] font-bold">
                                {vIdx + 1}
                              </span>
                              <div>
                                <p className="text-xs font-bold text-slate-900">
                                  {visit.invoice} · {visit.dateTime}
                                </p>
                                {visit.note && (
                                  <p className="text-[10px] text-slate-400">{visit.note}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-black text-rose-600">
                              ₹{visit.amount.toLocaleString("en-IN")}
                            </span>
                          </div>

                          {/* Itemized List for this visit */}
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <Package className="h-3 w-3 text-slate-400" /> Items Taken:
                            </p>
                            <div className="divide-y divide-slate-100 bg-white rounded-lg border border-slate-200/60 overflow-hidden">
                              {visit.items.map((item, iIdx) => (
                                <div
                                  key={iIdx}
                                  className="flex items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-50/50"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[10px] font-bold text-slate-400">
                                      {iIdx + 1}.
                                    </span>
                                    <span className="font-semibold text-slate-800 truncate">
                                      {item.product}
                                    </span>
                                    <span className="text-[10px] text-slate-400 shrink-0">
                                      (Qty: {item.quantity} × ₹{item.unit_price})
                                    </span>
                                  </div>
                                  <span className="font-bold text-slate-900 shrink-0 ml-2">
                                    ₹{item.total || item.quantity * item.unit_price}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Repayments History (if any) */}
                    {cust.repayments && cust.repayments.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Repayments Recorded:
                        </p>
                        <div className="space-y-1">
                          {cust.repayments.map((rep, rIdx) => (
                            <div
                              key={rIdx}
                              className="flex items-center justify-between text-xs px-2.5 py-1 rounded-lg bg-emerald-50/60 text-emerald-900 font-medium"
                            >
                              <span>
                                {rep.note || "Payment received"} · {rep.dateTime}
                              </span>
                              <span className="font-bold text-emerald-700">
                                -₹{rep.amount}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Collect Payment Modal */}
      {collectModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600 text-white">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Collect Pay Later Amount
                  </h3>
                  <p className="text-xs text-slate-400">
                    Record payment for {collectModalCustomer.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCollectModalCustomer(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Total Balance Overview */}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-rose-50 p-3 border border-rose-100">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                  Total Outstanding Balance
                </p>
                <p className="text-lg font-black text-rose-700">
                  ₹{collectModalCustomer.totalDue.toLocaleString("en-IN")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCollectAmount(String(collectModalCustomer.totalDue))}
                className="rounded-lg bg-white border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
              >
                Full Settle
              </button>
            </div>

            <form onSubmit={handleConfirmCollect} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Amount Received (₹) *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-base font-bold text-slate-900 outline-none focus:border-emerald-500"
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCollectMode("Cash")}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 text-xs font-bold transition ${
                      collectMode === "Cash"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Banknote className="h-4 w-4" /> Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectMode("UPI")}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 text-xs font-bold transition ${
                      collectMode === "UPI"
                        ? "border-violet-600 bg-violet-50 text-violet-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="h-4 w-4" /> UPI / QR
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={collectNote}
                  onChange={(e) => setCollectNote(e.target.value)}
                  placeholder="e.g. Cleared bill 1 and partial bill 2"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCollectModalCustomer(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition"
                >
                  Confirm Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

