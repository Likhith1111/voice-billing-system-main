import { useEffect, useState, useRef } from "react";
import QRCode from "react-qr-code";
import {
  X,
  CheckCircle2,
  Clock,
  Smartphone,
  Copy,
  Share2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface UpiPaymentModalProps {
  amount: number;
  storeName: string;
  upiId: string;
  invoiceNumber?: string;
  customerName?: string;
  onClose: () => void;
  onPaymentConfirmed: () => void;
}

const UPI_APPS = [
  { name: "GPay", color: "#4285F4", icon: "G" },
  { name: "PhonePe", color: "#5f259f", icon: "P" },
  { name: "Paytm", color: "#00BAF2", icon: "T" },
  { name: "BHIM", color: "#138808", icon: "B" },
];

export default function UpiPaymentModal({
  amount,
  storeName,
  upiId,
  invoiceNumber,
  customerName,
  onClose,
  onPaymentConfirmed,
}: UpiPaymentModalProps) {
  const [seconds, setSeconds] = useState(0);
  const [paid, setPaid] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UPI deep-link URL — scannable by any UPI app
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Payment for ${invoiceNumber || "Invoice"}`)}`;

  // Live elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const copyUpi = () => {
    navigator.clipboard.writeText(upiId);
    toast.success("UPI ID copied!");
  };

  const openUpiApp = (appName: string) => {
    window.open(upiUrl, "_blank");
    toast.info(`Opening ${appName}…`);
  };

  const handleConfirm = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPaid(true);
    setTimeout(() => {
      onPaymentConfirmed();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-md overflow-y-auto">
      <div
        className={`relative w-full max-w-sm my-auto overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-500 max-h-[92vh] flex flex-col ${
          paid ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {/* ── Success overlay ── */}
        {paid && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-emerald-500 text-white">
            <CheckCircle2 className="mb-3 h-16 w-16 animate-bounce" />
            <p className="text-2xl font-black">Payment Confirmed!</p>
            <p className="mt-1 text-sm opacity-80">₹{amount} received</p>
          </div>
        )}

        {/* ── Header ── */}
        <div className="shrink-0 relative bg-gradient-to-br from-violet-600 to-indigo-600 px-5 py-4 text-white">
          <button
            onClick={onClose}
            className="absolute right-3.5 top-3.5 rounded-full p-1 text-white/60 hover:bg-white/20 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                UPI Payment
              </p>
              <p className="text-lg font-black">₹{amount.toLocaleString("en-IN")}</p>
            </div>
          </div>
          {customerName && (
            <p className="mt-1.5 text-xs text-white/80 truncate">
              For: <span className="font-semibold text-white">{customerName}</span>
            </p>
          )}
          {/* Live timer */}
          <div className="absolute right-4 bottom-3 flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
            <Clock className="h-2.5 w-2.5" />
            {formatTime(seconds)}
          </div>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {/* ── QR Code ── */}
          <div className="mb-3 flex flex-col items-center">
            <div className="rounded-xl border-2 border-indigo-100 bg-white p-3 shadow-md">
              <QRCode value={upiUrl} size={150} level="M" />
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Scan with{" "}
              <span className="font-semibold text-slate-700">
                GPay, PhonePe, Paytm, BHIM
              </span>
            </p>
          </div>

          {/* ── UPI ID ── */}
          <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                UPI ID
              </p>
              <p className="font-mono text-sm font-bold text-slate-800">{upiId}</p>
            </div>
            <button
              onClick={copyUpi}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm border border-slate-200 transition hover:bg-indigo-50 hover:text-indigo-700"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>

          {/* ── Quick App Buttons ── */}
          <div className="mb-5">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              Or open directly in app
            </p>
            <div className="grid grid-cols-4 gap-2">
              {UPI_APPS.map((app) => (
                <button
                  key={app.name}
                  onClick={() => openUpiApp(app.name)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-3 text-center transition hover:border-indigo-200 hover:bg-indigo-50 hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-white shadow"
                    style={{ backgroundColor: app.color }}
                  >
                    {app.icon}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600">
                    {app.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Confirm button ── */}
          <button
            onClick={handleConfirm}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-700 active:scale-[0.98]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark as Paid — ₹{amount.toLocaleString("en-IN")} Received
          </button>

          <p className="mt-2 text-center text-[11px] text-slate-400">
            <Smartphone className="mb-0.5 inline h-3 w-3" /> Customer scans QR,
            pays on phone, then confirm above.
          </p>
        </div>
      </div>
    </div>
  );
}
