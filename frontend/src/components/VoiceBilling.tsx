import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Mic2, Square, Loader2, Sparkles, CheckCircle2, AlertCircle, Trash2, Send, Download, Plus, Minus, X } from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { useAuth } from "../App";
import UpiPaymentModal from "./UpiPaymentModal";
import PaymentModeModal, { type PaymentMode } from "./PaymentModeModal";
import WhatsAppModal from "./WhatsAppModal";
import { apiUrl } from "../config/api";
import { parseVoiceBillLocally, addStoreBill, getStoreProducts } from "../lib/offlineStore";
import { downloadInvoicePdf } from "../lib/pdfGenerator";

const defaultCatalog = [
  { id: 1, name: "Fresh Milk", detail: "Dairy · 500 ml", price: 32, emoji: "🥛" },
  { id: 2, name: "Farm Bread", detail: "Bakery · 400 g", price: 40, emoji: "🍞" },
  { id: 3, name: "Premium Rice", detail: "Grains · 1 kg", price: 68, emoji: "🍚" },
  { id: 4, name: "Farm Eggs", detail: "Eggs · 6 pieces", price: 48, emoji: "🥚" },
  { id: 5, name: "Red Apples", detail: "Produce · 1 kg", price: 140, emoji: "🍎" },
  { id: 6, name: "Cooking Oil", detail: "Grocery · 1 litre", price: 155, emoji: "🫗" },
  { id: 7, name: "Choco Biscuits", detail: "Snacks · 1 pack", price: 25, emoji: "🍪" },
  { id: 8, name: "Orange Juice", detail: "Beverage · 1 litre", price: 90, emoji: "🧃" },
];

export default function VoiceBilling() {
  const { shopkeeper } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [billingData, setBillingData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [approved, setApproved] = useState(false);
  const recognitionRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef("");
  const isManuallyStoppedRef = useRef(false);

  // Draft counter
  const [draftNumber] = useState(() => Math.floor(100 + Math.random() * 900));

  // Billing & WhatsApp State
  const [showPreview, setShowPreview] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [billCustomerName, setBillCustomerName] = useState("");

  // Payment Mode & UPI State
  const [showPaymentModeModal, setShowPaymentModeModal] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState<any>(null);

  const [lang, setLang] = useState("en-IN");
  const isRecordingRef = useRef(false);

  // Available shortcut products: combine store catalog or defaults
  const [catalogItems, setCatalogItems] = useState(defaultCatalog);

  useEffect(() => {
    try {
      const prods = getStoreProducts(shopkeeper?.email);
      if (prods && prods.length > 0) {
        const mapped = prods.slice(0, 8).map((p: any, idx: number) => ({
          id: p.id || idx + 10,
          name: p.name || p.title || "Product",
          detail: p.category || (p.stock ? `Stock: ${p.stock}` : "General Item"),
          price: Number(p.price || p.value || 50),
          emoji: p.category?.toLowerCase().includes("fruit") ? "🍎" : 
                 p.category?.toLowerCase().includes("dairy") ? "🥛" : 
                 p.category?.toLowerCase().includes("grain") ? "🍚" : "📦"
        }));
        setCatalogItems(mapped);
      }
    } catch (e) {}
  }, [shopkeeper?.email]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const requestMicPermission = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        await new Promise((r) => setTimeout(r, 150));
      }
      setError("");
      return true;
    } catch (err: any) {
      console.warn("Microphone permission check:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Microphone permission was denied. Please allow microphone access in your browser settings.");
        return false;
      }
      return true;
    }
  };

  const startRecording = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Your browser does not support Speech Recognition. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    const hasPerm = await requestMicPermission();
    if (!hasPerm) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      isRecordingRef.current = true;
      setError("");
    };

    recognition.onresult = (event: any) => {
      let newFinals = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) newFinals += text + " ";
        }
      }

      if (newFinals) {
        accumulatedTranscriptRef.current += newFinals;
        setTranscript(accumulatedTranscriptRef.current.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition notice:", event.error);
      if (event.error === "no-speech") return;
      if (event.error === "not-allowed") {
        setError("Microphone access was denied. Please click the permissions icon in your browser URL bar.");
        setIsRecording(false);
        isRecordingRef.current = false;
        return;
      }
      if (event.error === "network") {
        setError("Speech network connection issue. You can still type items or click quick products below.");
        setIsRecording(false);
        isRecordingRef.current = false;
        return;
      }
    };

    recognition.onend = () => {
      if (!isManuallyStoppedRef.current && isRecordingRef.current) {
        try {
          recognition.start();
        } catch (e) {}
      } else {
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    };

    recognitionRef.current = recognition;
    isManuallyStoppedRef.current = false;
    isRecordingRef.current = true;
    setTranscript("");
    accumulatedTranscriptRef.current = "";
    setError("");

    try {
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      try {
        recognition.abort();
        setTimeout(() => recognition.start(), 200);
      } catch (e) {}
    }
  };

  const stopRecording = () => {
    isManuallyStoppedRef.current = true;
    isRecordingRef.current = false;
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }

    setTimeout(() => {
      const captured = accumulatedTranscriptRef.current.trim() || transcript.trim();
      if (captured) {
        processBillWithText(captured);
      }
    }, 350);
  };

  const processBillWithText = async (customText?: string) => {
    const textToProcess = (customText || transcript).trim();
    if (!textToProcess) {
      toast.error("No speech detected. Please speak or type items.");
      return;
    }
    setProcessing(true);
    setError("");

    // 1. Try backend NLP parser first (if server is reachable)
    try {
      const response = await axios.post(
        apiUrl("/api/voice-billing/"),
        {
          text: textToProcess,
          shopkeeper_email: shopkeeper?.email,
        },
        { timeout: 2500 }
      );

      if (response.data && response.data.success) {
        setBillingData(response.data);
        const newItems = response.data.items.map((i: any) => ({
          ...i,
          quantity: i.quantity || 1,
          unit_price: i.unit_price || 0,
        }));
        setItems(newItems);
        setApproved(false);
        toast.success("Products matched successfully!");
        setProcessing(false);
        return;
      }
    } catch (err: any) {
      console.warn("Backend voice billing unreachable, using offline voice parser:", err);
    }

    // 2. Offline Smart Voice Parser fallback
    try {
      const localResult = parseVoiceBillLocally(textToProcess, shopkeeper?.email);
      if (localResult && localResult.items.length > 0) {
        setBillingData(localResult);
        const newItems = localResult.items.map((i: any) => ({
          ...i,
          quantity: i.quantity || 1,
          unit_price: i.unit_price || 0,
        }));
        setItems(newItems);
        setApproved(false);
        toast.success("Voice recognized and matched with store catalog!");
      } else {
        // Fallback rule matching for sample demo items
        const rules: [string, RegExp, number][] = [
          ["Fresh Milk", /\bmilk\b/i, 32],
          ["Farm Bread", /\bbread\b/i, 40],
          ["Premium Rice", /\brice\b/i, 68],
          ["Farm Eggs", /\beggs?\b/i, 48],
          ["Red Apples", /\bapples?\b/i, 140],
          ["Cooking Oil", /\boil\b/i, 155],
          ["Choco Biscuits", /\bbiscuits?\b|\bcookies?\b/i, 25],
          ["Orange Juice", /\bjuice\b/i, 90],
        ];

        let matched: any[] = [];
        for (const [prodName, regex, price] of rules) {
          const match = textToProcess.match(regex);
          if (match) {
            const prefix = textToProcess.slice(0, match.index);
            const numMatch = prefix.match(/(\d+)\s*(?:x\s*)?$/);
            const qty = numMatch ? parseInt(numMatch[1], 10) : 1;
            matched.push({ product: prodName, quantity: qty, unit_price: price });
          }
        }

        if (matched.length > 0) {
          setItems(matched);
          setApproved(false);
          toast.success(`${matched.length} product(s) matched from catalog!`);
        } else {
          setError("Could not identify the product and price. Try 'Add 2 milk and 1 bread'.");
        }
      }
    } catch (localErr) {
      console.error("Local parsing error:", localErr);
      setError("Could not parse command. Please speak or type again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = () => {
    setTranscript("");
    setBillingData(null);
    setItems([]);
    setBillCustomerName("");
    setApproved(false);
    toast.info("Invoice draft cleared.");
  };

  const handleItemChange = (index: number, field: string, value: number) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
    setApproved(false);
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
    setApproved(false);
  };

  const addQuickProduct = (product: any) => {
    const existingIndex = items.findIndex((i) => i.product.toLowerCase() === product.name.toLowerCase());
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          product: product.name,
          quantity: 1,
          unit_price: product.price,
          matched_in_db: true,
        },
      ]);
    }
    setApproved(false);
    toast.success(`Added ${product.name}`);
  };

  const calculateSubtotal = () => {
    return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
  };

  const calculateTax = () => {
    const sub = calculateSubtotal();
    return Math.round(sub * 0.05 * 100) / 100;
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const totalItemCount = () => {
    return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  };

  const sendToWhatsApp = () => {
    const grandTotal = calculateGrandTotal();
    if (grandTotal <= 0) {
      toast.error("Please add items to the invoice before sharing.");
      return;
    }
    setShowWhatsAppModal(true);
  };

  const handleCompleteSale = async () => {
    const grandTotal = calculateGrandTotal();
    if (grandTotal <= 0) {
      toast.error("Please add items to the invoice before finalizing.");
      return;
    }
    if (!approved) {
      toast.error("Please check Cashier Approval before finalizing.");
      return;
    }
    const invoiceNumber = `SQB-${Math.floor(1000 + Math.random() * 9000)}`;
    const customerNameToSave = billCustomerName.trim() || "Walk-in Customer";
    const customerInitials = billCustomerName.trim() ? billCustomerName.trim().substring(0, 2).toUpperCase() : "WC";
    setPendingInvoice({ invoiceNumber, customerNameToSave, customerInitials, grandTotal });
    setShowPaymentModeModal(true);
  };

  const handlePaymentModeSelected = async (
    mode: PaymentMode,
    status: "Paid" | "Pending",
    cashDetails?: { received: number; change: number }
  ) => {
    setShowPaymentModeModal(false);
    if (mode === "UPI") {
      setShowUpiModal(true);
    } else {
      await saveBillAndClear({
        ...pendingInvoice,
        payment_mode: mode,
        status: status,
      });
      if (mode === "Cash" && cashDetails && cashDetails.change > 0) {
        toast.info(`Return Change to customer: ₹${cashDetails.change}`, { duration: 5000 });
      }
    }
  };

  const saveBillAndClear = async ({
    invoiceNumber,
    customerNameToSave,
    customerInitials,
    grandTotal,
    payment_mode = "Cash",
    status = "Paid",
  }: any) => {
    const _now = new Date();
    // Generate demo QGBI identifier
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    const demoQgbi = "QGBI-" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();

    const billRecord = {
      invoice: invoiceNumber,
      customer: customerNameToSave,
      amount: `₹${grandTotal}`,
      time: new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).format(_now),
      created_at: _now.toISOString(),
      status: status,
      payment_mode: payment_mode,
      initials: customerInitials,
      tone: status === "Paid" ? "emerald" : "amber",
      items: items,
      shopkeeper_email: shopkeeper?.email,
      qgbi: billingData?.qgbi || demoQgbi,
    };

    try {
      const res = await axios.post(apiUrl("/api/bills/"), billRecord, { timeout: 3000 });
      const savedBill = res.data?.invoice ? res.data : billRecord;
      addStoreBill(savedBill, shopkeeper?.email);
      toast.success(`Invoice ${invoiceNumber} finalized! Downloading PDF...`);
      await downloadInvoicePdf(savedBill, shopkeeper);
      handleClear();
    } catch (err) {
      console.warn("Backend offline, saving bill locally:", err);
      const savedBill = addStoreBill(billRecord, shopkeeper?.email);
      toast.success(`Invoice ${invoiceNumber} finalized locally! Downloading PDF...`);
      await downloadInvoicePdf(savedBill, shopkeeper);
      handleClear();
    }
  };

  return (
    <div className="relative text-[#f5f5f2] max-w-[1450px] mx-auto pb-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
        <div>
          <div className="eyebrow mb-3">01 / BILLING TERMINAL</div>
          <h2 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tight text-white m-0">
            VOICE TO <span className="text-[#ff7900]">INVOICE.</span>
          </h2>
          <p className="text-xs text-[#899087] mt-2 mb-0">
            Speak your order naturally, review matched items, and approve the bill in real time.
          </p>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg border border-[#293329] bg-[#101610] text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setLang("en-IN")}
            className={`px-3 py-1.5 rounded-md transition ${lang === "en-IN" ? "bg-[#ff7900] text-white" : "text-[#899087] hover:text-white"}`}
          >
            EN-IN
          </button>
          <button
            type="button"
            onClick={() => setLang("hi-IN")}
            className={`px-3 py-1.5 rounded-md transition ${lang === "hi-IN" ? "bg-[#ff7900] text-white" : "text-[#899087] hover:text-white"}`}
          >
            HI-IN
          </button>
          <button
            type="button"
            onClick={() => setLang("en-US")}
            className={`px-3 py-1.5 rounded-md transition ${lang === "en-US" ? "bg-[#ff7900] text-white" : "text-[#899087] hover:text-white"}`}
          >
            EN-US
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Voice Terminal + Shortcuts */}
        <div className="lg:col-span-7 space-y-5">
          {/* Voice Command Center Panel */}
          <div className="p-6 rounded-2xl border border-[#293329] bg-gradient-to-br from-[#131a13] to-[#0e130e] shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="font-display font-bold text-lg text-white m-0 uppercase">Voice Command Center</h3>
                <p className="text-[11px] text-[#899087] m-0 mt-1">Smart continuous speech recognition &amp; catalog resolver</p>
              </div>
              <span className="pill">VOICE MODE</span>
            </div>

            {/* Mic Stage */}
            <div className="text-center py-4">
              <div className="mic-wrap">
                <div className="orb-ring"></div>
                <div className="orb-ring r2"></div>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={processing}
                  className={`mic ${isRecording ? "listening" : ""}`}
                  aria-label={isRecording ? "Stop voice input" : "Start voice input"}
                >
                  {processing ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : isRecording ? (
                    <Square className="w-8 h-8 fill-current text-white" />
                  ) : (
                    <Mic2 className="w-8 h-8 text-white" />
                  )}
                </button>
              </div>

              <h3 className="font-display font-bold text-xl text-white mt-4 mb-1">
                {isRecording ? "Listening to your voice…" : processing ? "Matching products…" : "Ready to listen."}
              </h3>
              <p className="text-xs text-[#899087] max-w-sm mx-auto leading-relaxed mb-4">
                {isRecording
                  ? "Speak items naturally (e.g. '2 milk packets and 1 bread'). Tap mic when done."
                  : "Tap the microphone or type below. Review the transcription before processing."}
              </p>

              {/* 35-bar equalizer visualizer */}
              <div className={`wave ${isRecording ? "on" : ""}`}>
                {Array.from({ length: 32 }, (_, i) => (
                  <span key={i}></span>
                ))}
              </div>
            </div>

            {/* Error banner if mic access was blocked */}
            {error && (
              <div className="mt-4 p-3.5 rounded-lg border border-red-900/60 bg-red-950/40 text-red-200 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={requestMicPermission}
                  className="px-2.5 py-1 rounded bg-red-800 text-[11px] font-bold text-white uppercase shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Transcript Area */}
            <div className="mt-5 p-4 rounded-xl border border-[#303b2e] bg-[#090e09]">
              <label className="block text-[10px] font-bold uppercase tracking-[1.3px] text-[#899087] mb-2" htmlFor="transcript">
                VOICE TRANSCRIPT / COMMAND
              </label>
              <textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Example: Add two milk packets and one bread"
                rows={3}
                className="w-full bg-transparent border-0 outline-none text-xs sm:text-sm text-white placeholder-[#6e776a] resize-none leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => processBillWithText()}
                disabled={processing || !transcript.trim()}
                className="btn btn-orange flex-1 py-3 text-xs uppercase tracking-wider font-bold"
              >
                <Sparkles className="w-3.5 h-3.5" /> Match Products
              </button>
              <button
                onClick={() => setTranscript("")}
                className="btn btn-dark py-3 px-5 text-xs uppercase tracking-wider font-bold"
              >
                Clear
              </button>
            </div>

            <div className="notice mt-4">
              AI speech parsing supports bilingual commands, phonetic item matching, and multi-quantity detection.
            </div>
          </div>

          {/* Quick-Add Product Shortcuts */}
          <div className="p-6 rounded-2xl border border-[#293329] bg-[#101610]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display font-bold text-base text-white m-0 uppercase">Quick-add products</h3>
                <p className="text-[11px] text-[#899087] m-0 mt-0.5">Instant catalog shortcuts to build your invoice</p>
              </div>
              <span className="text-[10px] font-bold text-[#899087] uppercase tracking-wider">Tap to add</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {catalogItems.map((p) => (
                <div
                  key={p.id}
                  onClick={() => addQuickProduct(p)}
                  className="p-3 rounded-xl border border-[#293329] bg-[#111811] hover:border-[#ff7900]/60 hover:-translate-y-0.5 transition duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div className="h-12 w-full flex items-center justify-center rounded-lg bg-[#1c251a] text-2xl mb-2.5">
                    {p.emoji}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white truncate m-0">{p.name}</h4>
                    <p className="text-[10px] text-[#899087] truncate m-0 mt-0.5">{p.detail}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#293329]/60">
                    <strong className="text-xs text-white">₹{p.price}</strong>
                    <span className="w-6 h-6 rounded-md border border-[#ff7900]/40 bg-[#ff7900]/10 text-[#ff7900] flex items-center justify-center text-sm font-bold">
                      +
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Checkout Cart & Cashier Approval */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-6 rounded-2xl border border-[#293329] bg-gradient-to-br from-[#131a13] to-[#0e130e] shadow-xl sticky top-24">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#293329]">
              <div>
                <div className="eyebrow text-[9px] py-1 px-2.5 mb-1.5">LIVE CHECKOUT</div>
                <h3 className="font-display font-bold text-2xl text-white m-0 uppercase">Current Invoice</h3>
              </div>
              <span className="pill text-[10px] px-3 py-1.5">
                {String(totalItemCount()).padStart(2, "0")} ITEMS
              </span>
            </div>

            {/* Reference Badge */}
            <div className="flex items-center justify-between p-3 my-4 rounded-lg border border-dashed border-[#3a4536] bg-[#0c120c] text-xs">
              <span className="text-[#899087] uppercase tracking-wider text-[10px]">DRAFT REFERENCE</span>
              <strong className="font-mono text-white text-xs">SQB-DRAFT-{String(draftNumber).padStart(3, "0")}</strong>
            </div>

            {/* Customer Name Input */}
            <div className="mb-4">
              <label className="block text-[10px] font-bold uppercase tracking-[1px] text-[#899087] mb-1.5">
                Customer Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Walk-in Customer"
                value={billCustomerName}
                onChange={(e) => setBillCustomerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#293329] bg-[#0c110c] text-xs text-white placeholder-[#60675f] outline-none focus:border-[#ff7900]"
              />
            </div>

            {/* Items List */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="py-12 text-center text-[#899087] border border-dashed border-[#293329] rounded-xl my-2">
                  <div className="text-3xl mb-2 text-[#ff7900]/40">◈</div>
                  <p className="text-xs m-0">Your invoice starts here.<br />Speak a command or tap quick-add products.</p>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-[#242e22] bg-[#0e140e] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-white truncate">{item.product}</div>
                      <div className="text-[10px] text-[#899087] mt-0.5">₹{item.unit_price} per unit</div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleItemChange(idx, "quantity", Math.max(1, (item.quantity || 1) - 1))}
                          className="w-6 h-6 rounded border border-[#374233] bg-[#192119] text-white flex items-center justify-center text-xs font-bold hover:bg-[#253225]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs text-white min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleItemChange(idx, "quantity", (item.quantity || 1) + 1)}
                          className="w-6 h-6 rounded border border-[#374233] bg-[#192119] text-white flex items-center justify-center text-xs font-bold hover:bg-[#253225]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-xs text-white">
                        ₹{(item.quantity * item.unit_price).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-[10px] text-[#ff9a7b] hover:text-red-400 mt-2 block ml-auto"
                      >
                        Remove ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals Breakdown */}
            <div className="mt-5 pt-4 border-t border-[#293329] space-y-2 text-xs">
              <div className="flex justify-between text-[#899087]">
                <span>Subtotal</span>
                <strong className="text-white">₹{calculateSubtotal().toFixed(2)}</strong>
              </div>
              <div className="flex justify-between text-[#899087]">
                <span>Illustrative GST · 5%</span>
                <strong className="text-white">₹{calculateTax().toFixed(2)}</strong>
              </div>
              <div className="flex justify-between items-baseline pt-3 border-t border-[#293329]">
                <span className="font-bold text-sm text-white uppercase tracking-wider">Total payable</span>
                <strong className="font-display font-black text-3xl text-[#ff7900]">
                  ₹{calculateGrandTotal().toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Cashier Approval Gate */}
            <div className="confirm">
              <b className="text-[#ffbd75] text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#ff7900]" /> Cashier approval
              </b>
              <p className="text-[10px] text-[#899087] m-0 mt-1.5 leading-relaxed">
                Verify each product, quantity, unit price, and final tax before finalizing the invoice.
              </p>
            </div>

            <label className="flex items-start gap-2.5 my-3 cursor-pointer text-xs text-[#a6ad9f]">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
                className="mt-0.5 accent-[#ff7900] w-4 h-4 rounded cursor-pointer"
              />
              <span className="leading-tight">I have reviewed and approved the current invoice items and total.</span>
            </label>

            {/* Action Buttons */}
            <div className="space-y-2.5 mt-4">
              <button
                onClick={handleCompleteSale}
                disabled={items.length === 0 || !approved}
                className="btn btn-orange w-full py-3.5 text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-[#ff7900]/20"
              >
                Finalize invoice ↗
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={items.length === 0}
                  className="btn btn-dark py-2.5 text-[11px] font-bold uppercase"
                >
                  Clear Draft
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  disabled={items.length === 0}
                  className="btn btn-dark py-2.5 text-[11px] font-bold uppercase"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={sendToWhatsApp}
                  disabled={items.length === 0}
                  className="btn py-2.5 text-[11px] font-bold uppercase bg-[#1a2f1c] border-[#25d366]/40 text-[#25d366] hover:bg-[#25d366]/20"
                >
                  WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Quick Receipt Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-[#ff7900]/40 bg-[#101610] p-6 text-white shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute right-4 top-4 p-2 text-[#899087] hover:text-white rounded-lg hover:bg-[#1b241b]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="font-display font-black text-2xl tracking-wider text-white">
                <span className="text-[#ff7900]">SMART</span>Q-BILL
              </div>
              <p className="text-[11px] text-[#899087] uppercase tracking-wider mt-1">
                Official Checkout Receipt Preview
              </p>
            </div>

            <div className="mb-4 space-y-2 border-b border-dashed border-[#293329] pb-4 text-xs text-[#b8beb4]">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span>{item.quantity}x {item.product}</span>
                  <span className="font-bold text-white">₹{(item.quantity * item.unit_price).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 mb-6 text-xs text-[#899087]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-white">₹{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (5%):</span>
                <span className="text-white">₹{calculateTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-[#293329]">
                <span>Total Payable:</span>
                <span className="text-[#ff7900] font-display font-black text-2xl">
                  ₹{calculateGrandTotal().toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-[#293329] bg-[#0c120c] mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#ff7900] mb-2.5">
                UPI Instant Checkout QR
              </p>
              <div className="p-3 bg-white rounded-xl shadow-lg">
                <QRCode
                  value={`upi://pay?pa=${encodeURIComponent((shopkeeper as any)?.upi_id || "smartq@upi")}&pn=${encodeURIComponent(shopkeeper?.store_name || "SmartQ Store")}&am=${calculateGrandTotal()}&cu=INR`}
                  size={120}
                  level="M"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  downloadInvoicePdf({
                    invoice: `SQB-${Math.floor(1000 + Math.random() * 9000)}`,
                    customer: billCustomerName.trim() || "Walk-in Customer",
                    amount: `₹${calculateGrandTotal().toFixed(2)}`,
                    items: items,
                    payment_mode: "Cash",
                    status: "Paid",
                  }, shopkeeper);
                }}
                className="btn btn-outline py-3 text-xs uppercase font-bold"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="btn btn-orange py-3 text-xs uppercase font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        items={items}
        grandTotal={calculateGrandTotal()}
        initialCustomerName={billCustomerName}
        shopkeeper={shopkeeper}
      />

      {/* Payment Mode Selection Modal */}
      {showPaymentModeModal && pendingInvoice && (
        <PaymentModeModal
          amount={pendingInvoice.grandTotal}
          invoiceNumber={pendingInvoice.invoiceNumber}
          customerName={pendingInvoice.customerNameToSave}
          storeName={shopkeeper?.business_name || shopkeeper?.store_name || "SmartQ Store"}
          upiId={(shopkeeper as any)?.upi_id}
          onClose={() => setShowPaymentModeModal(false)}
          onSelectPaymentMode={handlePaymentModeSelected}
        />
      )}

      {/* UPI Payment Modal */}
      {showUpiModal && pendingInvoice && (
        <UpiPaymentModal
          amount={pendingInvoice.grandTotal}
          storeName={shopkeeper?.business_name || shopkeeper?.store_name || "SmartQ Store"}
          upiId={(shopkeeper as any)?.upi_id || ""}
          invoiceNumber={pendingInvoice.invoiceNumber}
          customerName={pendingInvoice.customerNameToSave}
          onClose={() => setShowUpiModal(false)}
          onPaymentConfirmed={async () => {
            setShowUpiModal(false);
            await saveBillAndClear({
              ...pendingInvoice,
              payment_mode: "UPI",
              status: "Paid",
            });
          }}
        />
      )}
    </div>
  );
}
