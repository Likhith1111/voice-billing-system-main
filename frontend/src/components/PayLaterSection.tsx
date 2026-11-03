import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  ArrowDownLeft,
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
  Phone,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash2,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../App";
import UpiPaymentModal from "./UpiPaymentModal";
import {
  getStorePayLaterCustomers,
  settleCustomerPayLater,
  purgeLegacyKhataHistory,
  clearStoreKhata,
  type PayLaterCustomer,
  type PayLaterVisit,
} from "../lib/offlineStore";
import { openWhatsApp } from "../lib/whatsapp";

export default function PayLaterSection() {
  const { shopkeeper } = useAuth();
  const [payLaterCustomers, setPayLaterCustomers] = useState<PayLaterCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "multi" | "settled">("all");

  // Keep all customer cards open/expanded by default so user sees date, time, and items immediately!
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());

  // Collect Payment Modal State
  const [collectModalCustomer, setCollectModalCustomer] = useState<PayLaterCustomer | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>("");
  const [collectMode, setCollectMode] = useState<"Cash" | "UPI">("Cash");
  const [collectNote, setCollectNote] = useState<string>("");

  // UPI QR Code state for Pay Later collection
  const [payLaterUpiData, setPayLaterUpiData] = useState<{
    customer: PayLaterCustomer;
    amount: number;
    note: string;
  } | null>(null);

  const refreshPayLaterData = () => {
    const list = getStorePayLaterCustomers(shopkeeper?.email);
    setPayLaterCustomers(list);
  };

  useEffect(() => {
    // Automatically purge legacy mock/test history so the section runs purely on live data
    purgeLegacyKhataHistory(shopkeeper?.email);
    refreshPayLaterData();

    const handleUpdate = () => {
      refreshPayLaterData();
    };

    window.addEventListener("qbill-bill-added", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("qbill-bill-added", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [shopkeeper?.email]);

  const handleClearAllHistory = () => {
    const confirm = window.confirm(
      "Are you sure you want to clear all previous Pay Later history? This will clear all historical records so only new live credit bills appear going forward."
    );
    if (!confirm) return;

    clearStoreKhata(shopkeeper?.email);
    refreshPayLaterData();
    toast.success("Pay Later history cleared! Ready for live credit billing.");
  };

  const toggleCollapse = (key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Open Collect Payment Modal
  const handleOpenCollect = (cust: PayLaterCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

    if (amt > collectModalCustomer.totalDue + 0.01) {
      toast.error(`Amount cannot exceed the total balance due of ₹${collectModalCustomer.totalDue}`);
      return;
    }

    // If UPI selected, open the dynamic UPI QR Code Modal for the exact amount entered
    if (collectMode === "UPI") {
      setPayLaterUpiData({
        customer: collectModalCustomer,
        amount: amt,
        note: collectNote,
      });
      setCollectModalCustomer(null);
      return;
    }

    // Cash settlement
    settleCustomerPayLater(
      collectModalCustomer.customerPhone,
      collectModalCustomer.customerName,
      amt,
      "Cash",
      collectNote,
      shopkeeper?.email
    );

    const remaining = Math.max(0, collectModalCustomer.totalDue - amt);
    if (remaining <= 0) {
      toast.success(
        `✅ All Pay Later dues cleared for ${collectModalCustomer.customerName} via Cash!`,
        { duration: 4000 }
      );
    } else {
      toast.success(
        `Collected ₹${amt.toLocaleString("en-IN")} via Cash from ${collectModalCustomer.customerName}! Remaining: ₹${remaining}.`,
        { duration: 4000 }
      );
    }

    setCollectModalCustomer(null);
    refreshPayLaterData();
  };

  // 1-Click WhatsApp Payment Reminder with item list
  const handleSendReminder = (cust: PayLaterCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const phone = cust.customerPhone;
    if (!phone) {
      toast.error("Customer phone number not available for WhatsApp reminder.");
      return;
    }

    const storeName = shopkeeper?.store_name || "Our Grocery Store";
    const upiId = shopkeeper?.upi_id || "9704955713-2@ybl";
    const upiPayLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${cust.totalDue}&cu=INR`;

    let visitsSummary = "";
    cust.visits.forEach((v, idx) => {
      const itemsText = v.items
        .map((i) => `    • ${i.product} (${i.quantity} units) - ₹${i.total}`)
        .join("\n");
      visitsSummary += `\n*Visit ${idx + 1}: ${v.date}${v.time ? ` at ${v.time}` : ""} (Invoice ${v.invoice}) - ₹${v.amount}*\n${itemsText}\n`;
    });

    const message =
      `Namaste ${cust.customerName} ji 🙏\n\n` +
      `Gentle payment reminder from *${storeName}*.\n` +
      `Your outstanding *Pay Later / Udhar* balance is: *₹${cust.totalDue.toLocaleString("en-IN")}*\n` +
      `Total Pay Later visits: *${cust.visitCount}*\n` +
      `---------------------------------\n` +
      `*Itemized Purchases Breakdown:*` +
      `${visitsSummary}\n` +
      `---------------------------------\n` +
      `💳 *Pay easily via UPI:*\n` +
      `UPI ID: *${upiId}*\n` +
      `Pay Link: ${upiPayLink}\n\n` +
      `Thank you for shopping with us! 🙏`;

    openWhatsApp(phone, message);
    toast.success(`WhatsApp reminder opened for ${cust.customerName}!`);
  };

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return payLaterCustomers.filter((c) => {
      const matchSearch =
        c.customerName.toLowerCase().includes(search.toLowerCase()) ||
        c.customerPhone.includes(search);

      if (!matchSearch) return false;

      if (filterMode === "multi") return c.visitCount >= 2;
      if (filterMode === "settled") return c.totalDue <= 0;
      return c.totalDue > 0;
    });
  }, [payLaterCustomers, search, filterMode]);

  const totalOutstandingAll = payLaterCustomers.reduce((acc, c) => acc + c.totalDue, 0);
  const activeDebtorsCount = payLaterCustomers.filter((c) => c.totalDue > 0).length;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6 mb-7">
      {/* Live Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm shadow-orange-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-[16px] font-bold tracking-tight text-slate-950">
                  Pay Later &amp; Udhar Tracker
                </h2>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Active
                </span>
                {activeDebtorsCount > 0 && (
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-700">
                    {activeDebtorsCount} Pending
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Live customer credit with itemized purchases, dates, times &amp; 1-click collection
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100 px-4 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
              Total Outstanding Due
            </p>
            <p className="text-base sm:text-lg font-black text-rose-700">
              ₹{totalOutstandingAll.toLocaleString("en-IN")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearAllHistory}
            title="Clear all Pay Later history (start fresh)"
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600 hover:bg-red-100 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset History</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name or mobile..."
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs outline-none focus:border-amber-400 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              filterMode === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Pending ({activeDebtorsCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("multi")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              filterMode === "multi"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            ⚡ Multi-Visit (2+ visits)
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("settled")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              filterMode === "settled"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Settled (₹0)
          </button>
          <button
            type="button"
            onClick={handleClearAllHistory}
            title="Reset Pay Later history (start fresh from now)"
            className="ml-1 flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100 transition"
          >
            <Trash2 className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>

      {/* Customer Pay Later Cards List */}
      <div className="mt-5 space-y-4">
        {filteredCustomers.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100">
              <BookOpen className="h-7 w-7 text-emerald-400" />
            </div>
            <p className="font-bold text-slate-700 text-sm">
              {filterMode === "settled" ? "No settled records yet" : "No active Pay Later records"}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {filterMode === "settled"
                ? "Once a customer clears their dues, they'll appear here."
                : "This section is live & active. Bills created with 'Udhar / Credit' payment mode will appear here automatically."}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Active — Waiting for new credit bills
            </span>
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const customerKey = cust.customerPhone || cust.customerName;
            const isCollapsed = collapsedKeys.has(customerKey);
            const hasDue = cust.totalDue > 0;
            const isMultiVisit = cust.visitCount >= 2;

            return (
              <div
                key={customerKey}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-slate-300"
              >
                {/* Customer Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50/80 border-b border-slate-100">
                  {/* Left: Identity & Badges */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 font-black text-white text-sm shadow-sm">
                      {cust.customerName
                        ? cust.customerName.substring(0, 2).toUpperCase()
                        : "CU"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-sm">
                          {cust.customerName}
                        </h3>
                        {/* Multi-Visit Badge with Active Indicator */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-black ${
                            isMultiVisit
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-slate-200/80 text-slate-700"
                          }`}
                        >
                          <Clock className="h-3 w-3 text-amber-700" />
                          {cust.visitCount} Pay Later {cust.visitCount === 1 ? "visit" : "visits"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {cust.customerPhone || "No mobile registered"}
                      </p>
                    </div>
                  </div>

                  {/* Right: Total Balance Due & Immediate Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Total Balance Due
                      </p>
                      <p
                        className={`text-base sm:text-lg font-black ${
                          hasDue ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {hasDue ? `₹${cust.totalDue.toLocaleString("en-IN")}` : "₹0 (Settled)"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasDue && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleSendReminder(cust, e)}
                            className="flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                            title="Send WhatsApp payment reminder"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenCollect(cust, e)}
                            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
                          >
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                            Collect ₹{cust.totalDue.toLocaleString("en-IN")}
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleCollapse(customerKey)}
                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100"
                        title={isCollapsed ? "Expand visit breakdown" : "Collapse breakdown"}
                      >
                        {isCollapsed ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ACTIVE LIVE ITEM BREAKDOWN (VISIBLE BY DEFAULT) */}
                {!isCollapsed && (
                  <div className="p-4 bg-white space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                          <Layers className="h-3.5 w-3.5" />
                        </span>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                          Itemized Visits &amp; Products Taken ({cust.visits.length}{" "}
                          {cust.visits.length === 1 ? "purchase" : "purchases"})
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">
                        Total Credit: ₹{cust.totalGiven.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* Visits Timeline */}
                    <div className="space-y-3">
                      {cust.visits.map((visit, vIdx) => (
                        <div
                          key={visit.id || vIdx}
                          className="rounded-xl border border-slate-200/70 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/40 p-3.5"
                        >
                          {/* Visit Meta Header: Number, Date, Time & Invoice */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white text-[10px] font-black">
                                {vIdx + 1}
                              </span>
                              <div>
                                <span className="font-extrabold text-slate-900 text-xs">
                                  Visit #{vIdx + 1} · {visit.invoice}
                                </span>
                                <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                  <Calendar className="h-3 w-3 text-slate-400" />
                                  {visit.date}
                                  {visit.time && (
                                    <>
                                      <span>·</span>
                                      <Clock className="h-3 w-3 text-slate-400" />
                                      {visit.time}
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>

                            <span className="text-xs font-black text-rose-600 self-start sm:self-auto bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                              Amount: ₹{visit.amount.toLocaleString("en-IN")}
                            </span>
                          </div>

                          {/* Items Grid for this Visit */}
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1.5">
                              <Package className="h-3 w-3 text-amber-500" /> Products Taken in this
                              Visit:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {visit.items.map((item, iIdx) => (
                                <div
                                  key={iIdx}
                                  className="flex items-center justify-between rounded-lg bg-white border border-slate-200/60 px-3 py-2 text-xs shadow-2xs hover:border-violet-200 transition"
                                >
                                  <div className="min-w-0 pr-2">
                                    <p className="font-bold text-slate-800 text-xs truncate">
                                      {item.product}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      Qty: <span className="font-bold text-slate-600">{item.quantity}</span> × ₹
                                      {item.unit_price}
                                    </p>
                                  </div>
                                  <span className="font-extrabold text-slate-900 shrink-0 text-xs">
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
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Repayment History:
                        </p>
                        <div className="space-y-1">
                          {cust.repayments.map((rep, rIdx) => (
                            <div
                              key={rIdx}
                              className="flex items-center justify-between text-xs text-emerald-900"
                            >
                              <span>
                                {rep.note || "Payment received"} ({rep.dateTime})
                              </span>
                              <span className="font-bold text-emerald-700">
                                -₹{rep.amount.toLocaleString("en-IN")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bottom Summary & Collection Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <div className="text-xs text-slate-500">
                        Total Credit: <span className="font-bold text-slate-800">₹{cust.totalGiven.toLocaleString("en-IN")}</span> · Repaid: <span className="font-bold text-emerald-600">₹{cust.totalRepaid.toLocaleString("en-IN")}</span> · Net Due: <span className="font-black text-rose-600">₹{cust.totalDue.toLocaleString("en-IN")}</span>
                      </div>

                      {hasDue && (
                        <button
                          type="button"
                          onClick={() => handleOpenCollect(cust)}
                          className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95"
                        >
                          <ArrowDownLeft className="h-4 w-4" />
                          Collect Payment for {cust.customerName}
                        </button>
                      )}
                    </div>
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
                    Record payment from {collectModalCustomer.customerName}
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

              {/* Dynamic Remaining Balance Preview before generating QR or cash */}
              {(() => {
                const enteredAmt = parseFloat(collectAmount) || 0;
                const remainingBal = Math.max(0, collectModalCustomer.totalDue - enteredAmt);
                return (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Amount paying now ({collectMode}):</span>
                      <span className="font-bold text-slate-900">₹{enteredAmt.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex items-center justify-between font-bold pt-1.5 border-t border-slate-200/80">
                      <span className="text-slate-600">Remaining Udhar balance:</span>
                      <span className={remainingBal === 0 ? "text-emerald-600" : "text-rose-700"}>
                        ₹{remainingBal.toLocaleString("en-IN")} {remainingBal === 0 ? "(Fully Cleared)" : ""}
                      </span>
                    </div>
                  </div>
                );
              })()}

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
                    <QrCode className="h-4 w-4" /> UPI / QR
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
                  className={`rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 ${
                    collectMode === "UPI"
                      ? "bg-violet-600 hover:bg-violet-700 shadow-violet-600/20"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  }`}
                >
                  {collectMode === "UPI" ? (
                    <>
                      <QrCode className="h-4 w-4" />
                      Generate UPI QR Code (₹{collectAmount || 0})
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm Cash Collection
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic UPI QR Code Modal for Pay Later collection */}
      {payLaterUpiData && (
        <UpiPaymentModal
          amount={payLaterUpiData.amount}
          storeName={shopkeeper?.store_name || "SmartQ Store"}
          upiId={shopkeeper?.upi_id || "9704955713-2@ybl"}
          customerName={payLaterUpiData.customer.customerName}
          invoiceNumber={`UDHAR-${payLaterUpiData.customer.customerName.replace(/\s+/g, "")}`}
          onClose={() => setPayLaterUpiData(null)}
          onPaymentConfirmed={() => {
            settleCustomerPayLater(
              payLaterUpiData.customer.customerPhone,
              payLaterUpiData.customer.customerName,
              payLaterUpiData.amount,
              "UPI",
              payLaterUpiData.note || "Pay Later UPI QR payment",
              shopkeeper?.email
            );
            const remaining = Math.max(0, payLaterUpiData.customer.totalDue - payLaterUpiData.amount);
            if (remaining <= 0) {
              toast.success(`✅ All Pay Later dues cleared for ${payLaterUpiData.customer.customerName} via UPI QR!`);
            } else {
              toast.success(
                `✅ Collected ₹${payLaterUpiData.amount.toLocaleString("en-IN")} via UPI QR from ${payLaterUpiData.customer.customerName}! Remaining balance: ₹${remaining}.`
              );
            }
            setPayLaterUpiData(null);
            refreshPayLaterData();
          }}
        />
      )}
    </div>
  );
}
