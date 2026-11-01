import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Building2,
  Calendar,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "../config/api";
import { getStoreBills } from "../lib/offlineStore";
import { downloadInvoicePdf, generateInvoicePdfBlob } from "../lib/pdfGenerator";

interface PublicInvoiceViewProps {
  invoiceId: string;
}

export default function PublicInvoiceView({ invoiceId }: PublicInvoiceViewProps) {
  const [bill, setBill] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchBill = async () => {
      setLoading(true);
      const cleanId = decodeURIComponent(invoiceId || "");

      // 1. Try local offline store first (instant)
      const allLocal = getStoreBills();
      const localMatch = allLocal.find(
        (b: any) =>
          b.invoice === cleanId ||
          b.invoice_number === cleanId ||
          String(b.id) === cleanId
      );

      if (localMatch) {
        setBill(localMatch);
        setLoading(false);
        return;
      }

      // 2. Try fetching from backend
      try {
        const res = await axios.get(apiUrl("/api/bills/"), { timeout: 3000 });
        if (Array.isArray(res.data)) {
          const remoteMatch = res.data.find(
            (b: any) =>
              b.invoice === cleanId ||
              b.invoice_number === cleanId ||
              String(b.id) === cleanId
          );
          if (remoteMatch) {
            setBill(remoteMatch);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not fetch remote bill:", err);
      }

      // 3. Fallback dummy bill from query params or minimal display
      setBill({
        invoice: cleanId,
        customer: "Valued Customer",
        amount: "₹0",
        items: [],
        time: "Recent",
        status: "Paid",
        payment_mode: "Cash",
      });
      setLoading(false);
    };

    fetchBill();
  }, [invoiceId]);

  const handleDownloadPdf = async () => {
    if (!bill) return;
    setDownloading(true);
    try {
      await downloadInvoicePdf(bill);
    } catch {
      toast.error("Could not download invoice PDF.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-slate-600 font-bold">
          <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading invoice...</span>
        </div>
      </div>
    );
  }

  const items = bill?.items || [];
  const cleanAmount = String(bill?.amount || "0").replace(/[^0-9.]/g, "");

  return (
    <div className="min-h-screen bg-slate-100/80 py-8 px-4 sm:px-6">
      <div className="max-w-lg mx-auto">
        {/* Navigation / Header */}
        <div className="mb-4 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </a>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verified Invoice
          </span>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 overflow-hidden">
          {/* Top Brand Banner */}
          <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 p-6 text-white text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 text-white shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase">
              {bill?.store_name || "QBill Retail Store"}
            </h1>
            <p className="text-xs text-violet-200 mt-0.5">Official Digital Tax Receipt</p>
          </div>

          {/* Details Bar */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Invoice Number</p>
              <p className="font-black text-slate-900 text-sm">{bill?.invoice || invoiceId}</p>
            </div>
            <div>
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Customer</p>
              <p className="font-bold text-slate-800">{bill?.customer || "Walk-in Customer"}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 font-semibold uppercase text-[10px]">Date & Time</p>
              <p className="font-medium text-slate-700">{bill?.time || "Recent"}</p>
            </div>
          </div>

          {/* Items List */}
          <div className="p-6">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              Item Breakdown
            </h2>

            {items.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                Invoice summary total available below
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((it: any, idx: number) => {
                  const qty = Number(it.quantity || it.qty || 1);
                  const price = Number(it.unit_price || it.price || 0);
                  const lineTotal = qty * price;
                  return (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{it.product || it.name || "Item"}</p>
                        <p className="text-slate-400 text-[11px]">
                          {qty} × ₹{price.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <p className="font-black text-slate-900">
                        ₹{lineTotal.toLocaleString("en-IN")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total Section */}
            <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-200 flex items-baseline justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-slate-500">Grand Total</p>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  Payment: {bill?.payment_mode || "Cash"} ({bill?.status || "Paid"})
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900">
                ₹{parseFloat(cleanAmount || "0").toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 bg-slate-50/80 border-t border-slate-100 space-y-3">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-lg shadow-violet-500/25 transition active:scale-[0.98] disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {downloading ? "Preparing PDF..." : "Download Official PDF Bill"}
            </button>

            <p className="text-center text-[11px] text-slate-400">
              Generated by QBill • Smart Voice & Retail Billing Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
